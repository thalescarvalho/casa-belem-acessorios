import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrencyBRL } from '@/lib/utils'
import type { CategoryRow } from '@/types/catalog'

export interface CatalogFilters {
  categorySlug: string | null
  minPriceCents: number | null
  maxPriceCents: number | null
  onSale: boolean
  isNew: boolean
}

interface FiltersSidebarProps {
  categories: CategoryRow[]
  filters: CatalogFilters
  onChange: (filters: CatalogFilters) => void
  priceCeilingCents: number
  className?: string
}

export function FiltersSidebar({
  categories,
  filters,
  onChange,
  priceCeilingCents,
  className,
}: FiltersSidebarProps) {
  const [range, setRange] = React.useState<[number, number]>([
    filters.minPriceCents ?? 0,
    filters.maxPriceCents ?? priceCeilingCents,
  ])

  React.useEffect(() => {
    setRange([filters.minPriceCents ?? 0, filters.maxPriceCents ?? priceCeilingCents])
  }, [filters.minPriceCents, filters.maxPriceCents, priceCeilingCents])

  return (
    <aside className={cn('space-y-6', className)}>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Categorias
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onChange({ ...filters, categorySlug: null })}
            className={cn(
              'block text-sm text-muted-foreground hover:text-primary',
              filters.categorySlug === null && 'font-semibold text-primary',
            )}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange({ ...filters, categorySlug: category.slug })}
              className={cn(
                'block text-sm text-muted-foreground hover:text-primary',
                filters.categorySlug === category.slug && 'font-semibold text-primary',
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Faixa de preço
        </h3>
        <Slider
          min={0}
          max={priceCeilingCents}
          step={500}
          value={range}
          onValueChange={(value) => setRange(value as [number, number])}
          onValueCommit={(value) =>
            onChange({ ...filters, minPriceCents: value[0], maxPriceCents: value[1] })
          }
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatCurrencyBRL(range[0])}</span>
          <span>{formatCurrencyBRL(range[1])}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Disponibilidade
        </h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-onsale"
            checked={filters.onSale}
            onCheckedChange={(checked) => onChange({ ...filters, onSale: checked === true })}
          />
          <Label htmlFor="filter-onsale" className="text-sm font-normal">
            Em promoção
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-new"
            checked={filters.isNew}
            onCheckedChange={(checked) => onChange({ ...filters, isNew: checked === true })}
          />
          <Label htmlFor="filter-new" className="text-sm font-normal">
            Novidades
          </Label>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          onChange({
            categorySlug: null,
            minPriceCents: null,
            maxPriceCents: null,
            onSale: false,
            isNew: false,
          })
        }
      >
        Limpar filtros
      </Button>
    </aside>
  )
}
