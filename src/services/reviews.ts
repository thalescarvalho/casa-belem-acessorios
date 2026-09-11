import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Review = Database['public']['Tables']['reviews']['Row'] & {
  profiles: { full_name: string | null } | null
}

export async function fetchApprovedReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as Review[]) ?? []
}

export async function fetchMyReview(productId: string, userId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitReview(params: {
  productId: string
  userId: string
  rating: number
  title?: string
  comment?: string
}) {
  const { error } = await supabase.from('reviews').upsert(
    {
      product_id: params.productId,
      user_id: params.userId,
      rating: params.rating,
      title: params.title ?? null,
      comment: params.comment ?? null,
      status: 'pending',
    },
    { onConflict: 'product_id,user_id' },
  )
  if (error) throw error
}
