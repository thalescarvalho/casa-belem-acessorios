import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

export interface AdminOrderFilters {
  orderNumber?: string
  status?: OrderStatus
  page?: number
  pageSize?: number
}

export async function fetchAdminOrders(filters: AdminOrderFilters = {}) {
  const { orderNumber, status, page = 1, pageSize = 20 } = filters
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (orderNumber) query = query.ilike('order_number', `%${orderNumber}%`)
  if (status) query = query.eq('status', status)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) throw error
  return { items: data ?? [], total: count ?? 0 }
}

export async function fetchAdminOrderDetail(orderId: string) {
  const [
    { data: order, error: orderError },
    { data: items, error: itemsError },
    { data: history, error: historyError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase.from('orders').select('*').eq('id', orderId).single(),
    supabase.from('order_items').select('*').eq('order_id', orderId),
    supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase.from('payments').select('*').eq('order_id', orderId),
  ])

  if (orderError) throw orderError
  if (itemsError) throw itemsError
  if (historyError) throw historyError
  if (paymentsError) throw paymentsError

  let customerPhone: string | null = order.guest_phone
  let customerName: string = order.guest_name ?? ''

  if (order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id)
      .maybeSingle()
    customerPhone = profile?.phone ?? null
    customerName = profile?.full_name ?? ''
  }

  return {
    order,
    items: items ?? [],
    history: history ?? [],
    payments: payments ?? [],
    customerPhone,
    customerName,
  }
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ['payment_approved', 'cancelled'],
  payment_approved: ['preparing', 'cancelled', 'refunded'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

export function getAvailableNextStatuses(current: OrderStatus): OrderStatus[] {
  return NEXT_STATUS[current] ?? []
}

export interface TrackingInput {
  trackingCode: string | null
  carrier: string | null
  trackingUrl: string | null
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  tracking?: TrackingInput,
) {
  const { error } = await supabase
    .from('orders')
    .update({
      status,
      ...(tracking
        ? {
            tracking_code: tracking.trackingCode,
            carrier: tracking.carrier,
            tracking_url: tracking.trackingUrl,
          }
        : {}),
    })
    .eq('id', orderId)
  if (error) throw error
}

export async function updateOrderTracking(orderId: string, tracking: TrackingInput) {
  const { error } = await supabase
    .from('orders')
    .update({
      tracking_code: tracking.trackingCode,
      carrier: tracking.carrier,
      tracking_url: tracking.trackingUrl,
    })
    .eq('id', orderId)
  if (error) throw error
}

export async function cancelOrder(orderId: string, reason?: string) {
  const { error } = await supabase.rpc('cancel_order', {
    p_order_id: orderId,
    p_reason: reason ?? null,
  })
  if (error) throw error
}
