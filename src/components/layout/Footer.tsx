import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { paths } from '@/routes/paths'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

export function Footer() {
  const { settings } = useSiteSettings()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-display text-xl font-semibold">{settings.site_name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{settings.tagline}</p>
          {settings.instagram_url && (
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
              Siga no Instagram
            </a>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            Institucional
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to={paths.about} className="text-muted-foreground hover:text-primary">
                Sobre nós
              </Link>
            </li>
            <li>
              <Link to={paths.contact} className="text-muted-foreground hover:text-primary">
                Contato
              </Link>
            </li>
            <li>
              <Link to={paths.products} className="text-muted-foreground hover:text-primary">
                Todos os produtos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            Políticas
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to={paths.returnsPolicy} className="text-muted-foreground hover:text-primary">
                Trocas e devoluções
              </Link>
            </li>
            <li>
              <Link to={paths.shippingPolicy} className="text-muted-foreground hover:text-primary">
                Política de envio
              </Link>
            </li>
            <li>
              <Link to={paths.privacyPolicy} className="text-muted-foreground hover:text-primary">
                Privacidade
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            Contato
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {settings.contact_email && <li>{settings.contact_email}</li>}
            {settings.contact_address && <li>{settings.contact_address}</li>}
            {settings.business_hours && <li>{settings.business_hours}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t py-4">
        <p className="container text-center text-xs text-muted-foreground">
          © {year} {settings.site_name}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
