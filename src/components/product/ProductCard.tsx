import { Link } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import { paths } from '@/routes/paths'
import { cn, formatCurrencyBRL, formatInstallments } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useCartStore, cartItemKey } from '@/features/cart/cartStore'
import { useFavoritesStore } from '@/features/favorites/favoritesStore'
import type { ProductListItem } from '@/types/catalog'
import { toast } from 'sonner'

interface ProductCardProps {
  product: ProductListItem
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { settings } = useSiteSettings()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const isFavorite = useFavoritesStore((s) => s.has(product.id))
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  const finalPriceCents = product.sale_price_cents ?? product.price_cents
  const hasDiscount =
    product.sale_price_cents != null && product.sale_price_cents < product.price_cents
  const alreadyInCart = cartItems.some((i) => i.key === cartItemKey(product.id, null))

  function handleAddToCart() {
    if (!product.in_stock) return
    addItem(
      {
        productId: product.id,
        variantId: null,
        categoryId: product.category_id,
        name: product.name,
        slug: product.slug,
        image: product.primary_image_url,
        variantLabel: null,
        unitPriceCents: finalPriceCents,
        stockAvailable: null,
      },
      1,
    )
    toast.success(`${product.name} adicionado ao carrinho`)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link to={paths.product(product.slug)}>
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Sem imagem
            </div>
          )}
        </Link>

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {hasDiscount && <Badge variant="destructive">Promoção</Badge>}
          {product.is_new && <Badge>Novidade</Badge>}
          {product.is_bestseller && <Badge variant="secondary">Mais vendido</Badge>}
        </div>

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFavorite}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-background"
        >
          <Heart className={cn('h-4 w-4', isFavorite && 'fill-destructive text-destructive')} />
        </button>

        {!product.in_stock && (
          <div className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1 text-center text-xs font-medium text-background">
            Esgotado
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.category_name && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.category_name}
          </span>
        )}
        <Link
          to={paths.product(product.slug)}
          className="line-clamp-2 font-medium leading-snug hover:text-primary"
        >
          {product.name}
        </Link>

        <div className="mt-1 flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrencyBRL(product.price_cents)}
            </span>
          )}
          <span className="text-lg font-semibold text-foreground">
            {formatCurrencyBRL(finalPriceCents)}
          </span>
        </div>
        {settings.payment_methods.credit_card && settings.payment_methods.max_installments > 1 && (
          <span className="text-xs text-muted-foreground">
            {formatInstallments(finalPriceCents, settings.payment_methods.max_installments)}
          </span>
        )}

        <Button
          type="button"
          size="sm"
          variant={alreadyInCart ? 'secondary' : 'default'}
          className="mt-2 w-full"
          disabled={!product.in_stock}
          onClick={handleAddToCart}
        >
          <ShoppingBag />
          {!product.in_stock
            ? 'Indisponível'
            : alreadyInCart
              ? 'Adicionar mais'
              : 'Adicionar ao carrinho'}
        </Button>
      </div>
    </div>
  )
}
