import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore, cartItemKey } from './cartStore'

const baseItem = {
  productId: 'prod-1',
  variantId: null as string | null,
  categoryId: null as string | null,
  name: 'Anel Solitário',
  slug: 'anel-solitario',
  image: null,
  variantLabel: null,
  unitPriceCents: 8900,
  stockAvailable: null as number | null,
}

beforeEach(() => {
  useCartStore.setState({ items: [], coupon: null })
})

describe('cartItemKey', () => {
  it('combines product and variant ids', () => {
    expect(cartItemKey('p1', 'v1')).toBe('p1:v1')
  })

  it('falls back to "default" when there is no variant', () => {
    expect(cartItemKey('p1', null)).toBe('p1:default')
  })
})

describe('useCartStore', () => {
  it('adds a new item with the requested quantity', () => {
    useCartStore.getState().addItem(baseItem, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('merges quantities when adding the same product/variant again', () => {
    useCartStore.getState().addItem(baseItem, 1)
    useCartStore.getState().addItem(baseItem, 3)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(4)
  })

  it('never exceeds stockAvailable when adding to an existing line', () => {
    useCartStore.getState().addItem({ ...baseItem, stockAvailable: 5 }, 3)
    useCartStore.getState().addItem({ ...baseItem, stockAvailable: 5 }, 10)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('increments and decrements quantity', () => {
    useCartStore.getState().addItem(baseItem, 1)
    const key = cartItemKey(baseItem.productId, baseItem.variantId)
    useCartStore.getState().increment(key)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
    useCartStore.getState().decrement(key)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('removes the item once its quantity is decremented to 0', () => {
    useCartStore.getState().addItem(baseItem, 1)
    const key = cartItemKey(baseItem.productId, baseItem.variantId)
    useCartStore.getState().decrement(key)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removes the item when setQuantity is called with 0 or less', () => {
    useCartStore.getState().addItem(baseItem, 3)
    const key = cartItemKey(baseItem.productId, baseItem.variantId)
    useCartStore.getState().setQuantity(key, 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears items and coupon', () => {
    useCartStore.getState().addItem(baseItem, 1)
    useCartStore
      .getState()
      .applyCoupon({ code: 'PROMO10', discountCents: 1000, freeShipping: false })
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().coupon).toBeNull()
  })

  it('treats different variants of the same product as separate lines', () => {
    useCartStore.getState().addItem(baseItem, 1)
    useCartStore.getState().addItem({ ...baseItem, variantId: 'v1', variantLabel: 'Dourado' }, 1)
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})
