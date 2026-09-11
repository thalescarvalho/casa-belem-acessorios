import { describe, expect, it } from 'vitest'
import {
  calcDiscountCents,
  calcItemTotalCents,
  calcSubtotalCents,
  calcTotalCents,
  calcTotalQuantity,
} from './cartMath'

describe('calcSubtotalCents', () => {
  it('sums unit price times quantity across items', () => {
    expect(
      calcSubtotalCents([
        { unitPriceCents: 1000, quantity: 2 },
        { unitPriceCents: 500, quantity: 3 },
      ]),
    ).toBe(3500)
  })

  it('returns 0 for an empty cart', () => {
    expect(calcSubtotalCents([])).toBe(0)
  })
})

describe('calcItemTotalCents', () => {
  it('multiplies unit price by quantity', () => {
    expect(calcItemTotalCents({ unitPriceCents: 1990, quantity: 3 })).toBe(5970)
  })
})

describe('calcDiscountCents', () => {
  it('computes a percentage discount rounded to the nearest cent', () => {
    expect(calcDiscountCents({ subtotalCents: 9999, type: 'percentage', value: 10 })).toBe(1000)
  })

  it('caps a fixed discount at the subtotal', () => {
    expect(calcDiscountCents({ subtotalCents: 1000, type: 'fixed', value: 50 })).toBe(1000)
  })

  it('applies a fixed discount below the subtotal normally', () => {
    expect(calcDiscountCents({ subtotalCents: 10000, type: 'fixed', value: 20 })).toBe(2000)
  })

  it('returns 0 discount for free_shipping coupons (handled via shipping, not price)', () => {
    expect(calcDiscountCents({ subtotalCents: 10000, type: 'free_shipping', value: 0 })).toBe(0)
  })

  it('returns 0 when the subtotal is 0', () => {
    expect(calcDiscountCents({ subtotalCents: 0, type: 'percentage', value: 50 })).toBe(0)
  })
})

describe('calcTotalCents', () => {
  it('subtracts discount and adds shipping', () => {
    expect(calcTotalCents({ subtotalCents: 10000, discountCents: 2000, shippingCents: 1500 })).toBe(
      9500,
    )
  })

  it('never goes below the shipping cost even if discount exceeds subtotal', () => {
    expect(calcTotalCents({ subtotalCents: 1000, discountCents: 5000, shippingCents: 1500 })).toBe(
      1500,
    )
  })

  it('ignores a negative shipping value', () => {
    expect(calcTotalCents({ subtotalCents: 1000, discountCents: 0, shippingCents: -100 })).toBe(
      1000,
    )
  })
})

describe('calcTotalQuantity', () => {
  it('sums quantities across line items', () => {
    expect(
      calcTotalQuantity([
        { unitPriceCents: 100, quantity: 2 },
        { unitPriceCents: 200, quantity: 5 },
      ]),
    ).toBe(7)
  })
})
