import { useSiteSettings } from '@/contexts/SiteSettingsContext'

interface PolicyPageProps {
  policyKey: 'returns' | 'privacy' | 'shipping'
  title: string
}

export function PolicyPage({ policyKey, title }: PolicyPageProps) {
  const { settings } = useSiteSettings()
  const content = settings.policies[policyKey]

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-center font-display text-4xl font-semibold tracking-tight">{title}</h1>

        <div className="mt-10 text-base leading-relaxed text-foreground/90">
          {content ? (
            <div className="whitespace-pre-line">{content}</div>
          ) : (
            <p className="text-center text-muted-foreground">
              Esta política ainda não foi configurada. Em breve estará disponível aqui.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
