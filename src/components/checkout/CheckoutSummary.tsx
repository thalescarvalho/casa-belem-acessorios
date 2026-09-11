import { Separator } from '@/components/ui/separator'
import { formatCurrencyBRL } from '@/lib/utils'
import type { CartItem } from '@/features/cart/cartStore'

interface CheckoutSummaryProps {
  items: CartItem[]
  subtotalCents: number
  discountCents: number
  shippingCents: number | null
  totalCents: number
}

export function CheckoutSummary({
  items,
  subtotalCents,
  discountCents,
  shippingCents,
  totalCents,
}: CheckoutSummaryProps) {
  return (
    <div className="h-fit rounded-lg border p-5">
      <h2 className="font-display text-lg font-semibold">Resumo do pedido</h2>

      <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image && (
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="line-clamp-1 font-medium">{item.name}</p>
              <p className="text-muted-foreground">Qtd: {item.quantity}</p>
            </div>
            <span className="font-medium">
              {formatCurrencyBRL(item.unitPriceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Frete</span>
          <span>
            {shippingCents === null
              ? '—'
              : shippingCents === 0
                ? 'Grátis'
                : formatCurrencyBRL(shippingCents)}
          </span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatCurrencyBRL(totalCents)}</span>
      </div>
    </div>
  )
}
