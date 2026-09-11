import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import type { SiteSettings } from '@/contexts/SiteSettingsContext'

export async function updateSiteSetting<K extends keyof SiteSettings>(
  key: K,
  value: SiteSettings[K],
) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value: value as unknown as Json })
  if (error) throw error
}

export async function updateSiteSettings(entries: Partial<SiteSettings>) {
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value: value as unknown as Json,
  }))
  const { error } = await supabase.from('site_settings').upsert(rows)
  if (error) throw error
}
