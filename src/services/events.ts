import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type EventRow = Database['public']['Tables']['events']['Row']

export async function fetchActiveEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('active', true)
    .order('event_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function isUpcomingEvent(event: EventRow, today: Date = new Date()): boolean {
  const referenceDate = event.end_date ?? event.event_date
  const todayStr = today.toISOString().slice(0, 10)
  return referenceDate >= todayStr
}
