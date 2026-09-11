// Funções puras de cálculo do carrinho — sem dependência de estado, banco ou
// React, para poderem ser testadas isoladamente (ver src/features/cart/cartMath.test.ts).
// O backend (public.create_order) RECALCULA tudo de novo a partir do preço
// real dos produtos: estes cálculos no frontend servem apenas para exibir
// valores ao usuário antes do checkout, nunca são a fonte de verdade.

export interface CartLineItem {
  unitPriceCents: number
  quantity: number
}

export function calcSubtotalCents(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
}

export function calcItemTotalCents(item: CartLineItem): number {
  return item.unitPriceCents * item.quantity
}

export interface DiscountInput {
  subtotalCents: number
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
}

export function calcDiscountCents({ subtotalCents, type, value }: DiscountInput): number {
  if (subtotalCents <= 0) return 0
  if (type === 'percentage') {
    return Math.round(subtotalCents * (value / 100))
  }
  if (type === 'fixed') {
    return Math.min(Math.round(value * 100), subtotalCents)
  }
  return 0
}

export interface TotalInput {
  subtotalCents: number
  discountCents: number
  shippingCents: number
}

export function calcTotalCents({
  subtotalCents,
  discountCents,
  shippingCents,
}: TotalInput): number {
  return Math.max(subtotalCents - discountCents, 0) + Math.max(shippingCents, 0)
}

export function calcTotalQuantity(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}
