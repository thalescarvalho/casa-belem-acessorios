import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  key: string
  productId: string
  variantId: string | null
  categoryId: string | null
  name: string
  slug: string
  image: string | null
  variantLabel: string | null
  unitPriceCents: number
  quantity: number
  stockAvailable: number | null
}

export interface AppliedCoupon {
  code: string
  discountCents: number
  freeShipping: boolean
}

interface CartState {
  items: CartItem[]
  coupon: AppliedCoupon | null
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => void
  removeItem: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  increment: (key: string) => void
  decrement: (key: string) => void
  clear: () => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
}

export function cartItemKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? 'default'}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      coupon: null,

      addItem: (item, quantity = 1) =>
        set((state) => {
          const key = cartItemKey(item.productId, item.variantId)
          const existing = state.items.find((i) => i.key === key)
          if (existing) {
            const maxQty = existing.stockAvailable ?? Infinity
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) } : i,
              ),
            }
          }
          return { items: [...state.items, { ...item, key, quantity }] }
        }),

      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) =>
                  i.key === key
                    ? { ...i, quantity: Math.min(quantity, i.stockAvailable ?? Infinity) }
                    : i,
                ),
        })),

      increment: (key) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key
              ? { ...i, quantity: Math.min(i.quantity + 1, i.stockAvailable ?? Infinity) }
              : i,
          ),
        })),

      decrement: (key) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.key === key ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [], coupon: null }),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
    }),
    { name: 'cb-cart-v1' },
  ),
)
