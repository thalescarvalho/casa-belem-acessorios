import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProductGalleryProps {
  images: { url: string; alt: string | null }[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [zoomPosition, setZoomPosition] = React.useState({ x: 50, y: 50 })
  const [isZooming, setIsZooming] = React.useState(false)

  const active = images[activeIndex]

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - bounds.left) / bounds.width) * 100
    const y = ((e.clientY - bounds.top) / bounds.height) * 100
    setZoomPosition({ x, y })
  }

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-lg bg-muted" />
  }

  return (
    <div>
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
      >
        <img
          src={active.url}
          alt={active.alt ?? productName}
          className={cn(
            'h-full w-full object-cover transition-transform duration-200',
            isZooming && 'scale-150',
          )}
          style={
            isZooming ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined
          }
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver imagem ${index + 1}`}
              className={cn(
                'aspect-square overflow-hidden rounded-md border-2 bg-muted',
                index === activeIndex ? 'border-primary' : 'border-transparent',
              )}
            >
              <img
                src={image.url}
                alt={image.alt ?? productName}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
