import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type EventRow = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export async function fetchAllEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createEvent(input: EventInsert) {
  const { data, error } = await supabase.from('events').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateEvent(id: string, input: EventUpdate) {
  const { data, error } = await supabase.from('events').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
