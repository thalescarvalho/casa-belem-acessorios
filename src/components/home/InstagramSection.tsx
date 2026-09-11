import { Instagram } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { Button } from '@/components/ui/button'

export function InstagramSection() {
  const { settings } = useSiteSettings()

  if (!settings.instagram_url) return null

  return (
    <section className="container py-12 text-center">
      <Instagram className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
        Siga a {settings.site_name}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Acompanhe lançamentos, novidades e os bastidores da loja no Instagram.
      </p>
      <Button asChild size="lg" className="mt-5">
        <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">
          <Instagram /> Seguir no Instagram
        </a>
      </Button>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <a
            key={i}
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver no Instagram"
            className="flex aspect-square items-center justify-center rounded-md bg-gradient-to-br from-primary/20 via-secondary to-accent/20 transition-opacity hover:opacity-80"
          >
            <Instagram className="h-5 w-5 text-primary/60" />
          </a>
        ))}
      </div>
    </section>
  )
}
