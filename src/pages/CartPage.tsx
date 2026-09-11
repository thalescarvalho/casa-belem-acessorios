import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/features/cart/cartStore'
import { calcSubtotalCents, calcTotalCents } from '@/features/cart/cartMath'
import { validateCoupon } from '@/services/coupons'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { formatCurrencyBRL } from '@/lib/utils'
import { buildCartWhatsappMessage, buildWhatsappUrl } from '@/utils/whatsapp'
import { paths } from '@/routes/paths'

export function CartPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const items = useCartStore((s) => s.items)
  const coupon = useCartStore((s) => s.coupon)
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)
  const removeItem = useCartStore((s) => s.removeItem)
  const applyCoupon = useCartStore((s) => s.applyCoupon)
  const removeCoupon = useCartStore((s) => s.removeCoupon)

  const [couponInput, setCouponInput] = React.useState('')
  const [isValidating, setIsValidating] = React.useState(false)

  const subtotalCents = calcSubtotalCents(items)
  // coupon.discountCents já vem calculado com autoridade pelo backend
  // (RPC validate_coupon) no momento em que o cupom foi aplicado; aqui só
  // limitamos à exibição para nunca mostrar um desconto maior que o
  // subtotal atual caso itens tenham sido removidos depois. O pedido final
  // sempre revalida o cupom no servidor (public.create_order).
  const discountCents = coupon ? Math.min(coupon.discountCents, subtotalCents) : 0
  const totalCents = calcTotalCents({ subtotalCents, discountCents, shippingCents: 0 })

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setIsValidating(true)
    try {
      const result = await validateCoupon(
        couponInput.trim(),
        items.map((i) => ({
          product_id: i.productId,
          category_id: i.categoryId,
          unit_price_cents: i.unitPriceCents,
          quantity: i.quantity,
        })),
        user?.id,
      )
      if (!result.valid) {
        toast.error(result.message)
        return
      }
      applyCoupon({
        code: couponInput.trim().toUpperCase(),
        discountCents: result.discount_cents,
        freeShipping: result.free_shipping,
      })
      toast.success(result.message)
      setCouponInput('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível validar o cupom.')
    } finally {
      setIsValidating(false)
    }
  }

  const whatsappUrl = settings.whatsapp_number
    ? buildWhatsappUrl(
        settings.whatsapp_number,
        buildCartWhatsappMessage(
          items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            variantLabel: i.variantLabel,
          })),
          totalCents,
        ),
      )
    : null

  if (items.length === 0) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-2xl font-semibold">Seu carrinho está vazio</h1>
        <Button asChild size="lg">
          <Link to={paths.products}>Ver produtos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">Meu carrinho</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.key} className="flex gap-4 rounded-lg border p-3">
              <Link
                to={paths.product(item.slug)}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
              >
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link to={paths.product(item.slug)} className="font-medium hover:text-primary">
                    {item.name}
                  </Link>
                  {item.variantLabel && (
                    <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyBRL(item.unitPriceCents)} / un.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => decrement(item.key)}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => increment(item.key)}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="font-semibold">
                    {formatCurrencyBRL(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.key)}
                aria-label="Remover item"
                className="self-start text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-lg border p-5">
          <h2 className="font-display text-lg font-semibold">Resumo</h2>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Cupom de desconto"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              disabled={Boolean(coupon)}
            />
            {coupon ? (
              <Button variant="outline" onClick={removeCoupon}>
                Remover
              </Button>
            ) : (
              <Button onClick={handleApplyCoupon} disabled={isValidating}>
                {isValidating ? 'Validando...' : 'Aplicar'}
              </Button>
            )}
          </div>
          {coupon && <p className="mt-2 text-xs text-success">Cupom "{coupon.code}" aplicado</p>}

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyBRL(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto</span>
                <span>-{formatCurrencyBRL(discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Frete</span>
              <span>Calculado no checkout</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrencyBRL(totalCents)}</span>
          </div>

          <Button size="lg" className="mt-5 w-full" onClick={() => navigate(paths.checkout)}>
            Finalizar compra
          </Button>

          {whatsappUrl && (
            <Button asChild size="lg" variant="whatsapp" className="mt-2 w-full">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Comprar pelo WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
