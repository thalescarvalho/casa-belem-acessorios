import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { paths } from '@/routes/paths'
import { useFavoritesStore } from '@/features/favorites/favoritesStore'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductListItem, ProductRow } from '@/types/catalog'

interface FavoriteProductRow {
  id: string
  name: string
  slug: string
  price_cents: number
  sale_price_cents: number | null
  category_id: string | null
  is_new: boolean
  is_bestseller: boolean
  product_images: { url: string; is_primary: boolean }[]
}

function mapFavoriteProduct(row: FavoriteProductRow): ProductListItem {
  const images = [...(row.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return 0
  })
  return {
    ...(row as unknown as ProductRow),
    primary_image_url: images[0]?.url ?? null,
    category_name: null,
    in_stock: true,
  }
}

export function AccountFavoritesPage() {
  const productIds = useFavoritesStore((s) => s.productIds)

  const favoritesQuery = useQuery({
    queryKey: ['favorite-products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return []
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, slug, price_cents, sale_price_cents, category_id, is_new, is_bestseller, product_images(url, is_primary)',
        )
        .in('id', productIds)
        .eq('status', 'active')
      if (error) throw error
      return (data as unknown as FavoriteProductRow[]).map(mapFavoriteProduct)
    },
    enabled: productIds.length > 0,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Favoritos</h2>
        <p className="text-sm text-muted-foreground">Produtos que você salvou para ver depois</p>
      </div>

      {productIds.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Você ainda não adicionou produtos aos favoritos.</p>
          <Button asChild>
            <Link to={paths.products}>Ver produtos</Link>
          </Button>
        </div>
      )}

      {productIds.length > 0 && favoritesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      )}

      {productIds.length > 0 && !favoritesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {(favoritesQuery.data ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
