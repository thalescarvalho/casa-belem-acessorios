import type { Database } from './database.types'

export type ProductRow = Database['public']['Tables']['products']['Row']
export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type ProductImageRow = Database['public']['Tables']['product_images']['Row']
export type ProductVariantRow = Database['public']['Tables']['product_variants']['Row']

export interface ProductListItem extends ProductRow {
  primary_image_url: string | null
  category_name: string | null
  in_stock: boolean
}

export interface VariantStock {
  variant_id: string | null
  quantity: number
  reserved_quantity: number
}

export interface ProductDetail extends ProductRow {
  category: CategoryRow | null
  images: ProductImageRow[]
  variants: ProductVariantRow[]
  stock_quantity: number
  stock_reserved: number
  variant_stock: VariantStock[]
  allow_backorder: boolean
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'bestsellers' | 'newest'
