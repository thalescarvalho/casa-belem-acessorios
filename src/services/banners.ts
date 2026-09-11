import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Banner = Database['public']['Tables']['banners']['Row']

export async function fetchActiveBanners(): Promise<Banner[]> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}
