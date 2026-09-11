import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type ProductRow = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type ProductImageRow = Database['public']['Tables']['product_images']['Row']
export type ProductVariantRow = Database['public']['Tables']['product_variants']['Row']
export type InventoryRow = Database['public']['Tables']['inventory']['Row']

export async function fetchAdminProducts(
  params: { search?: string; page?: number; pageSize?: number } = {},
) {
  const { search, page = 1, pageSize = 20 } = params
  let query = supabase
    .from('products')
    .select('*, categories(name), inventory(quantity, reserved_quantity, variant_id)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })

  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) throw error
  return { items: data ?? [], total: count ?? 0 }
}

export async function fetchAdminProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, images:product_images(*), variants:product_variants(*), inventory(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProduct(input: ProductInsert) {
  const { data, error } = await supabase.from('products').insert(input).select().single()
  if (error) throw error
  await supabase.from('inventory').insert({ product_id: data.id, variant_id: null, quantity: 0 })
  return data
}

export async function updateProduct(id: string, input: ProductUpdate) {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateProduct(id: string) {
  const original = await fetchAdminProductById(id)
  if (!original) throw new Error('Produto não encontrado.')

  return createProduct({
    sku: `${original.sku}-COPY-${Date.now()}`,
    name: `${original.name} (cópia)`,
    slug: `${original.slug}-copia-${Date.now()}`,
    description: original.description,
    category_id: original.category_id,
    price_cents: original.price_cents,
    sale_price_cents: original.sale_price_cents,
    weight_grams: original.weight_grams,
    length_cm: original.length_cm,
    width_cm: original.width_cm,
    height_cm: original.height_cm,
    tags: original.tags,
    status: 'draft',
    is_featured: original.is_featured,
    is_new: original.is_new,
    is_bestseller: original.is_bestseller,
    allow_backorder: original.allow_backorder,
    min_stock_alert: original.min_stock_alert,
    meta_title: original.meta_title,
    meta_description: original.meta_description,
  })
}

export async function addProductImage(
  productId: string,
  url: string,
  isPrimary: boolean,
  sortOrder: number,
) {
  const { error } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url, is_primary: isPrimary, sort_order: sortOrder })
  if (error) throw error
}

export async function removeProductImage(imageId: string) {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) throw error
}

export async function upsertVariant(
  input: Database['public']['Tables']['product_variants']['Insert'],
) {
  const { data, error } = await supabase.from('product_variants').upsert(input).select().single()
  if (error) throw error
  if (!input.id) {
    await supabase
      .from('inventory')
      .insert({ product_id: input.product_id, variant_id: data.id, quantity: 0 })
  }
  return data
}

export async function deleteVariant(id: string) {
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) throw error
}

export async function adjustInventory(inventoryId: string, newQuantity: number, reason: string) {
  const { data: inv, error: fetchError } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('id', inventoryId)
    .single()
  if (fetchError) throw fetchError

  const delta = newQuantity - inv.quantity

  const { error: updateError } = await supabase
    .from('inventory')
    .update({ quantity: newQuantity })
    .eq('id', inventoryId)
  if (updateError) throw updateError

  const { error: movementError } = await supabase
    .from('inventory_movements')
    .insert({ inventory_id: inventoryId, type: 'adjustment', quantity_delta: delta, reason })
  if (movementError) throw movementError
}

export async function fetchLowStockProducts(limit = 10) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, min_stock_alert, inventory(quantity, reserved_quantity)')
    .eq('status', 'active')
    .limit(200)
  if (error) throw error

  return (data ?? [])
    .map((p) => {
      const available = (p.inventory ?? []).reduce(
        (sum: number, inv: { quantity: number; reserved_quantity: number }) =>
          sum + Math.max(inv.quantity - inv.reserved_quantity, 0),
        0,
      )
      return { id: p.id, name: p.name, sku: p.sku, available, minStockAlert: p.min_stock_alert }
    })
    .filter((p) => p.available <= p.minStockAlert)
    .slice(0, limit)
}
