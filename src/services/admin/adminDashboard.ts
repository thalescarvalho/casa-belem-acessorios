import { startOfDay, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  salesTodayCents: number
  ordersToday: number
  salesMonthCents: number
  ordersMonth: number
  averageTicketCents: number
  pendingOrders: number
}

const PAID_STATUSES = ['payment_approved', 'preparing', 'shipped', 'delivered'] as const

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const todayIso = startOfDay(new Date()).toISOString()
  const monthIso = startOfMonth(new Date()).toISOString()

  const [
    { data: todayOrders, error: todayError },
    { data: monthOrders, error: monthError },
    { count: pendingOrders, error: pendingError },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_cents, status')
      .gte('created_at', todayIso)
      .in('status', PAID_STATUSES),
    supabase
      .from('orders')
      .select('total_cents, status')
      .gte('created_at', monthIso)
      .in('status', PAID_STATUSES),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_payment'),
  ])

  if (todayError) throw todayError
  if (monthError) throw monthError
  if (pendingError) throw pendingError

  const salesTodayCents = (todayOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)
  const salesMonthCents = (monthOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)
  const ordersMonth = monthOrders?.length ?? 0

  return {
    salesTodayCents,
    ordersToday: todayOrders?.length ?? 0,
    salesMonthCents,
    ordersMonth,
    averageTicketCents: ordersMonth > 0 ? Math.round(salesMonthCents / ordersMonth) : 0,
    pendingOrders: pendingOrders ?? 0,
  }
}

export async function fetchSalesByDay(days = 14) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_cents')
    .gte('created_at', since.toISOString())
    .in('status', PAID_STATUSES)
  if (error) throw error

  const byDay = new Map<string, number>()
  for (const order of data ?? []) {
    const day = order.created_at.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + order.total_cents)
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalCents]) => ({ date, totalCents }))
}
