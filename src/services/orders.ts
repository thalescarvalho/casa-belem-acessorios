import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database.types'

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderStatusHistoryEntry = Database['public']['Tables']['order_status_history']['Row']

export interface ShippingAddressInput {
  recipient_name: string
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

export interface CreateOrderParams {
  items: { product_id: string; variant_id: string | null; quantity: number }[]
  shippingAddress: ShippingAddressInput
  shippingMethod: 'pickup' | 'local_delivery' | 'standard' | 'free'
  couponCode?: string | null
  guestName?: string
  guestEmail?: string
  guestCpf?: string
  guestPhone?: string
  notes?: string
}

export async function createOrder(params: CreateOrderParams) {
  const { data, error } = await supabase.rpc('create_order', {
    p_items: params.items as unknown as Json,
    p_shipping_address: params.shippingAddress as unknown as Json,
    p_shipping_method: params.shippingMethod,
    p_coupon_code: params.couponCode ?? null,
    p_guest_name: params.guestName ?? null,
    p_guest_email: params.guestEmail ?? null,
    p_guest_cpf: params.guestCpf ?? null,
    p_guest_phone: params.guestPhone ?? null,
    p_notes: params.notes ?? null,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row as { order_id: string; order_number: string; total_cents: number }
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchOrderByNumber(orderNumber: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId)
  if (error) throw error
  return data ?? []
}

export async function fetchOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function calculateShippingPreview(
  method: string,
  subtotalCents: number,
): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_shipping', {
    p_method: method,
    p_subtotal_cents: subtotalCents,
  })
  if (error) throw error
  return data as unknown as number
}
