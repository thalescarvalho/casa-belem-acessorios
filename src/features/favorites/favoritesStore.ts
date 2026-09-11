import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Guarda favoritos localmente (visitante). Quando o usuário faz login, este
// estado é mesclado com public.favorites no Supabase e passa a refletir o
// servidor (ver src/features/favorites/useFavoritesSync.ts).
interface FavoritesState {
  productIds: string[]
  toggle: (productId: string) => void
  add: (productId: string) => void
  remove: (productId: string) => void
  has: (productId: string) => boolean
  setAll: (ids: string[]) => void
  clear: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),
      add: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds
            : [...state.productIds, productId],
        })),
      remove: (productId) =>
        set((state) => ({ productIds: state.productIds.filter((id) => id !== productId) })),
      has: (productId) => get().productIds.includes(productId),
      setAll: (ids) => set({ productIds: ids }),
      clear: () => set({ productIds: [] }),
    }),
    { name: 'cb-favorites-v1' },
  ),
)
