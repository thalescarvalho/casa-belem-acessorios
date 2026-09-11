import * as React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Banner } from '@/services/banners'

interface HeroCarouselProps {
  banners: Banner[]
  isLoading: boolean
}

export function HeroCarousel({ banners, isLoading }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  if (isLoading) {
    return <Skeleton className="aspect-[16/7] w-full rounded-none sm:aspect-[21/8]" />
  }

  if (banners.length === 0) return null

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div className="relative min-w-0 flex-[0_0_100%]" key={banner.id}>
              <picture>
                {banner.mobile_image_url && (
                  <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />
                )}
                <img
                  src={banner.desktop_image_url}
                  alt={banner.title ?? ''}
                  className="aspect-[16/7] w-full object-cover sm:aspect-[21/8]"
                />
              </picture>
              {(banner.title || banner.subtitle || banner.button_label) && (
                <div className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-gradient-to-r from-foreground/50 via-foreground/10 to-transparent px-6 text-background sm:px-16">
                  {banner.title && (
                    <h2 className="max-w-lg font-display text-2xl font-semibold sm:text-4xl">
                      {banner.title}
                    </h2>
                  )}
                  {banner.subtitle && (
                    <p className="max-w-md text-sm sm:text-base">{banner.subtitle}</p>
                  )}
                  {banner.button_label && banner.button_url && (
                    <Button asChild size="lg">
                      <Link to={banner.button_url}>{banner.button_label}</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full opacity-90"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Banner anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full opacity-90"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Próximo banner"
          >
            <ChevronRight />
          </Button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Ir para o banner ${index + 1}`}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  'h-1.5 w-6 rounded-full bg-background/60 transition-colors',
                  index === selectedIndex && 'bg-background',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
