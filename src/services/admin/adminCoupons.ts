import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type CouponRow = Database['public']['Tables']['coupons']['Row']
export type CouponInsert = Database['public']['Tables']['coupons']['Insert']
export type CouponUpdate = Database['public']['Tables']['coupons']['Update']

export async function fetchAllCoupons(): Promise<CouponRow[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCoupon(input: CouponInsert) {
  const { data, error } = await supabase.from('coupons').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateCoupon(id: string, input: CouponUpdate) {
  const { data, error } = await supabase
    .from('coupons')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) throw error
}
