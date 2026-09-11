import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type BannerRow = Database['public']['Tables']['banners']['Row']
export type BannerInsert = Database['public']['Tables']['banners']['Insert']
export type BannerUpdate = Database['public']['Tables']['banners']['Update']

export async function fetchAllBanners(): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createBanner(input: BannerInsert) {
  const { data, error } = await supabase.from('banners').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateBanner(id: string, input: BannerUpdate) {
  const { data, error } = await supabase
    .from('banners')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBanner(id: string) {
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw error
}
