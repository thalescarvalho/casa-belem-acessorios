import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'

export interface CouponCartItem {
  product_id: string
  category_id: string | null
  unit_price_cents: number
  quantity: number
}

export interface CouponValidationResult {
  valid: boolean
  message: string
  coupon_id: string | null
  discount_cents: number
  free_shipping: boolean
}

export async function validateCoupon(
  code: string,
  items: CouponCartItem[],
  userId?: string | null,
): Promise<CouponValidationResult> {
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code,
    p_items: items as unknown as Json,
    p_user_id: userId ?? null,
  })
  if (error) throw error
  return data as unknown as CouponValidationResult
}
