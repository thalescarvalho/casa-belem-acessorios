import { Link } from 'react-router-dom'
import { paths } from '@/routes/paths'
import { Skeleton } from '@/components/ui/skeleton'
import type { CategoryRow } from '@/types/catalog'

export function CategoryGrid({
  categories,
  isLoading,
}: {
  categories: CategoryRow[]
  isLoading: boolean
}) {
  if (!isLoading && categories.length === 0) return null

  return (
    <section className="container py-10">
      <h2 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">Categorias</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))
          : categories.map((category) => (
              <Link
                key={category.id}
                to={paths.category(category.slug)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary" />
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/60 to-transparent p-3">
                  <span className="font-display text-sm font-medium text-background sm:text-base">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  )
}
