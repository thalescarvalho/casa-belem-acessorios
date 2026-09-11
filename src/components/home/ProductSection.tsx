import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton'
import { Button } from '@/components/ui/button'
import type { ProductListItem } from '@/types/catalog'

interface ProductSectionProps {
  title: string
  products: ProductListItem[]
  isLoading: boolean
  viewAllHref?: string
}

export function ProductSection({ title, products, isLoading, viewAllHref }: ProductSectionProps) {
  if (!isLoading && products.length === 0) return null

  return (
    <section className="container py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
        {viewAllHref && (
          <Button variant="ghost" asChild>
            <Link to={viewAllHref}>
              Ver todos <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
      {isLoading ? (
        <ProductGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
