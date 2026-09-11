import { supabase } from '@/lib/supabase'

export type ImageBucket =
  'product-images' | 'category-images' | 'banner-images' | 'site-assets' | 'event-images'

export async function uploadImage(bucket: ImageBucket, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
