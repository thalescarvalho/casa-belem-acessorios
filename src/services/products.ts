import { supabase } from '@/lib/supabase'
import type { ProductDetail, ProductListItem, SortOption } from '@/types/catalog'

const LIST_SELECT =
  '*, categories(name), product_images(url, is_primary, sort_order), inventory(quantity, reserved_quantity, variant_id)'

type RawProductRow = Record<string, unknown> & {
  categories: { name: string } | null
  product_images: { url: string; is_primary: boolean; sort_order: number }[]
  inventory: { quantity: number; reserved_quantity: number; variant_id: string | null }[]
  allow_backorder: boolean
}

function mapListItem(row: RawProductRow): ProductListItem {
  const images = [...(row.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })
  const totalAvailable = (row.inventory ?? []).reduce(
    (sum, inv) => sum + Math.max(inv.quantity - inv.reserved_quantity, 0),
    0,
  )

  return {
    ...(row as unknown as ProductListItem),
    primary_image_url: images[0]?.url ?? null,
    category_name: row.categories?.name ?? null,
    in_stock: totalAvailable > 0 || row.allow_backorder,
  }
}

export interface FetchProductsParams {
  categoryId?: string
  search?: string
  minPriceCents?: number
  maxPriceCents?: number
  onSale?: boolean
  isNew?: boolean
  sort?: SortOption
  page?: number
  pageSize?: number
}

export async function fetchProducts(params: FetchProductsParams = {}) {
  const {
    categoryId,
    search,
    minPriceCents,
    maxPriceCents,
    onSale,
    isNew,
    sort = 'relevance',
    page = 1,
    pageSize = 12,
  } = params

  let query = supabase
    .from('products')
    .select(LIST_SELECT, { count: 'exact' })
    .eq('status', 'active')

  if (categoryId) query = query.eq('category_id', categoryId)
  if (search && search.trim().length > 0) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (typeof minPriceCents === 'number') query = query.gte('price_cents', minPriceCents)
  if (typeof maxPriceCents === 'number') query = query.lte('price_cents', maxPriceCents)
  if (onSale) query = query.not('sale_price_cents', 'is', null)
  if (isNew) query = query.eq('is_new', true)

  switch (sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'bestsellers':
      query = query.order('sales_count', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) throw error

  return {
    items: (data as unknown as RawProductRow[]).map(mapListItem),
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function fetchFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(LIST_SELECT)
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as RawProductRow[]).map(mapListItem)
}

export async function fetchNewProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(LIST_SELECT)
    .eq('status', 'active')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as RawProductRow[]).map(mapListItem)
}

export async function fetchBestsellerProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(LIST_SELECT)
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .order('sales_count', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as RawProductRow[]).map(mapListItem)
}

export async function fetchPromoProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(LIST_SELECT)
    .eq('status', 'active')
    .not('sale_price_cents', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as RawProductRow[]).map(mapListItem)
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      '*, category:categories(*), images:product_images(*), variants:product_variants(*), inventory(quantity, reserved_quantity, variant_id)',
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as Record<string, unknown> & {
    inventory: { quantity: number; reserved_quantity: number; variant_id: string | null }[]
    images: ProductDetail['images']
    variants: ProductDetail['variants']
    category: ProductDetail['category']
  }

  const baseInventory = row.inventory.find((inv) => inv.variant_id === null)

  return {
    ...(row as unknown as ProductDetail),
    images: [...row.images].sort((a, b) => a.sort_order - b.sort_order),
    stock_quantity: baseInventory?.quantity ?? 0,
    stock_reserved: baseInventory?.reserved_quantity ?? 0,
    variant_stock: row.inventory.map((inv) => ({
      variant_id: inv.variant_id,
      quantity: inv.quantity,
      reserved_quantity: inv.reserved_quantity,
    })),
  }
}

export async function fetchRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 4,
) {
  let query = supabase
    .from('products')
    .select(LIST_SELECT)
    .eq('status', 'active')
    .neq('id', excludeProductId)
    .limit(limit)

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) throw error
  return (data as unknown as RawProductRow[]).map(mapListItem)
}
