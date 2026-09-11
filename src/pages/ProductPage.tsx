import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart, Minus, Plus, ShoppingBag } from 'lucide-react'
import { fetchProductBySlug, fetchRelatedProducts } from '@/services/products'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ReviewsSection } from '@/components/product/ReviewsSection'
import { ProductSection } from '@/components/home/ProductSection'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrencyBRL, formatInstallments } from '@/lib/utils'
import { useCartStore, cartItemKey } from '@/features/cart/cartStore'
import { useFavoritesStore } from '@/features/favorites/favoritesStore'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { buildProductWhatsappMessage, buildWhatsappUrl } from '@/utils/whatsapp'
import { paths } from '@/routes/paths'
import { MessageCircle } from 'lucide-react'
import { Seo } from '@/components/common/Seo'

export function ProductPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { settings } = useSiteSettings()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const [variantId, setVariantId] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(1)

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProductBySlug(slug),
  })
  const product = productQuery.data

  const relatedQuery = useQuery({
    queryKey: ['products', 'related', product?.id],
    queryFn: () => fetchRelatedProducts(product!.category_id, product!.id),
    enabled: Boolean(product),
  })

  const isFavorite = useFavoritesStore((s) => (product ? s.has(product.id) : false))
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  React.useEffect(() => {
    setVariantId(null)
    setQuantity(1)
  }, [slug])

  if (productQuery.isLoading) {
    return (
      <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Produto não encontrado</h1>
        <Button asChild>
          <Link to={paths.products}>Ver todos os produtos</Link>
        </Button>
      </div>
    )
  }

  const selectedVariant = product.variants.find((v) => v.id === variantId) ?? null
  const basePrice = product.sale_price_cents ?? product.price_cents
  const hasDiscount =
    product.sale_price_cents != null && product.sale_price_cents < product.price_cents
  const finalPriceCents = basePrice + (selectedVariant?.price_delta_cents ?? 0)

  const selectedInventory =
    product.variant_stock.find((inv) => inv.variant_id === variantId) ?? null
  const stockAvailable = selectedInventory
    ? selectedInventory.quantity - selectedInventory.reserved_quantity
    : null
  const inStock = product.allow_backorder || (stockAvailable === null ? true : stockAvailable > 0)

  const key = cartItemKey(product.id, variantId)
  const alreadyInCart = cartItems.some((i) => i.key === key)

  const handleAddToCart = () => {
    if (product.variants.length > 0 && !variantId) {
      toast.error('Selecione uma variação antes de continuar.')
      return
    }
    addItem(
      {
        productId: product.id,
        variantId,
        categoryId: product.category_id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? null,
        variantLabel: selectedVariant?.name ?? null,
        unitPriceCents: finalPriceCents,
        stockAvailable: stockAvailable,
      },
      quantity,
    )
    toast.success(`${product.name} adicionado ao carrinho`)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    navigate(paths.checkout)
  }

  const whatsappUrl = settings.whatsapp_number
    ? buildWhatsappUrl(
        settings.whatsapp_number,
        buildProductWhatsappMessage({
          name: product.name,
          quantity,
          unitPriceCents: finalPriceCents,
          url: `${window.location.origin}${paths.product(product.slug)}`,
          variantLabel: selectedVariant?.name,
        }),
      )
    : null

  return (
    <div className="container py-8">
      <Seo
        title={product.name}
        description={product.meta_description || product.description || undefined}
        image={product.images[0]?.url}
        type="product"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.meta_description || product.description || undefined,
          sku: product.sku,
          image: product.images.map((img) => img.url),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: (finalPriceCents / 100).toFixed(2),
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: window.location.href,
          },
        }}
      />
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to={paths.home} className="hover:text-primary">
          Início
        </Link>{' '}
        /{' '}
        <Link to={paths.products} className="hover:text-primary">
          Produtos
        </Link>
        {product.category && (
          <>
            {' '}
            /{' '}
            <Link to={paths.category(product.category.slug)} className="hover:text-primary">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <div className="flex gap-2">
            {hasDiscount && <Badge variant="destructive">Promoção</Badge>}
            {product.is_new && <Badge>Novidade</Badge>}
            {product.is_bestseller && <Badge variant="secondary">Mais vendido</Badge>}
          </div>

          <h1 className="mt-2 font-display text-3xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SKU: {selectedVariant?.sku ?? product.sku}
          </p>

          <div className="mt-4 flex items-baseline gap-3">
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrencyBRL(product.price_cents)}
              </span>
            )}
            <span className="text-3xl font-semibold">{formatCurrencyBRL(finalPriceCents)}</span>
          </div>
          {settings.payment_methods.credit_card &&
            settings.payment_methods.max_installments > 1 && (
              <p className="text-sm text-muted-foreground">
                {formatInstallments(finalPriceCents, settings.payment_methods.max_installments)}
              </p>
            )}

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-sm text-foreground/80">
              {product.description}
            </p>
          )}

          {product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Variações</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setVariantId(variant.id)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm',
                      variantId === variant.id
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'hover:border-primary',
                    )}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-medium">Quantidade</span>
            <div className="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setQuantity((q) =>
                    stockAvailable !== null ? Math.min(q + 1, Math.max(stockAvailable, 1)) : q + 1,
                  )
                }
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {!inStock && <span className="text-sm font-medium text-destructive">Esgotado</span>}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" disabled={!inStock} onClick={handleBuyNow}>
              Comprar agora
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={!inStock}
              onClick={handleAddToCart}
            >
              <ShoppingBag /> {alreadyInCart ? 'Adicionar mais' : 'Adicionar ao carrinho'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => toggleFavorite(product.id)}
              aria-pressed={isFavorite}
              aria-label="Favoritar"
            >
              <Heart className={cn(isFavorite && 'fill-destructive text-destructive')} />
            </Button>
          </div>

          {whatsappUrl && (
            <Button asChild variant="whatsapp" size="lg" className="mt-2 w-full">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Comprar pelo WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      <ProductSection
        title="Produtos relacionados"
        products={relatedQuery.data ?? []}
        isLoading={relatedQuery.isLoading}
      />

      <ReviewsSection productId={product.id} />
    </div>
  )
}
