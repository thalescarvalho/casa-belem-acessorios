import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { fetchActiveCategories } from '@/services/categories'
import { fetchProducts } from '@/services/products'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton'
import { FiltersSidebar, type CatalogFilters } from '@/components/catalog/FiltersSidebar'
import { Pagination } from '@/components/catalog/Pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { SortOption } from '@/types/catalog'
import { Seo } from '@/components/common/Seo'

const PRICE_CEILING_CENTS = 100_000
const PAGE_SIZE = 12

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevância',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  bestsellers: 'Mais vendidos',
  newest: 'Mais recentes',
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const categorySlug = searchParams.get('categoria')
  const search = searchParams.get('q') ?? ''
  const minPriceCents = searchParams.has('min') ? Number(searchParams.get('min')) : null
  const maxPriceCents = searchParams.has('max') ? Number(searchParams.get('max')) : null
  const onSale = searchParams.get('promocao') === '1'
  const isNew = searchParams.get('novidades') === '1'
  const page = searchParams.has('page') ? Number(searchParams.get('page')) : 1
  const sort: SortOption =
    (searchParams.get('sort') as SortOption) ??
    (searchParams.get('maisVendidos') === '1' ? 'bestsellers' : 'relevance')

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: fetchActiveCategories,
  })
  const categoryId = categoriesQuery.data?.find((c) => c.slug === categorySlug)?.id

  const productsQuery = useQuery({
    queryKey: [
      'products',
      'list',
      { categoryId, search, minPriceCents, maxPriceCents, onSale, isNew, sort, page },
    ],
    queryFn: () =>
      fetchProducts({
        categoryId,
        search,
        minPriceCents: minPriceCents ?? undefined,
        maxPriceCents: maxPriceCents ?? undefined,
        onSale,
        isNew,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !categorySlug || Boolean(categoryId) || categoriesQuery.isFetched,
  })

  function updateParams(next: Record<string, string | null>) {
    const updated = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') updated.delete(key)
      else updated.set(key, value)
    }
    updated.delete('page')
    setSearchParams(updated)
  }

  const filters: CatalogFilters = { categorySlug, minPriceCents, maxPriceCents, onSale, isNew }

  function handleFiltersChange(next: CatalogFilters) {
    updateParams({
      categoria: next.categorySlug,
      min: next.minPriceCents != null ? String(next.minPriceCents) : null,
      max: next.maxPriceCents != null ? String(next.maxPriceCents) : null,
      promocao: next.onSale ? '1' : null,
      novidades: next.isNew ? '1' : null,
    })
  }

  const filtersNode = (
    <FiltersSidebar
      categories={categoriesQuery.data ?? []}
      filters={filters}
      onChange={handleFiltersChange}
      priceCeilingCents={PRICE_CEILING_CENTS}
    />
  )

  return (
    <div className="container py-8">
      <Seo
        title={search ? `Busca: ${search}` : 'Produtos'}
        description="Confira todos os acessórios da Casa Belém Acessórios: anéis, brincos, colares, pulseiras e conjuntos."
        noindex={Boolean(search)}
      />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {search ? `Resultados para "${search}"` : 'Produtos'}
          </h1>
          {productsQuery.data && (
            <p className="text-sm text-muted-foreground">
              {productsQuery.data.total} produto(s) encontrado(s)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{filtersNode}</div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(value) => updateParams({ sort: value })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden lg:block">{filtersNode}</div>

        <div>
          {productsQuery.isLoading ? (
            <ProductGridSkeleton count={PAGE_SIZE} />
          ) : productsQuery.data && productsQuery.data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {productsQuery.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center">
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou a busca.</p>
            </div>
          )}

          {productsQuery.data && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={productsQuery.data.total}
              onPageChange={(nextPage) => {
                const updated = new URLSearchParams(searchParams)
                updated.set('page', String(nextPage))
                setSearchParams(updated)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
