import { useSiteSettings } from '@/contexts/SiteSettingsContext'

export function AboutPage() {
  const { settings } = useSiteSettings()

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-primary">
          Sobre nós
        </p>
        <h1 className="mt-2 text-center font-display text-4xl font-semibold tracking-tight">
          {settings.site_name}
        </h1>
        {settings.tagline && (
          <p className="mt-3 text-center text-lg text-muted-foreground">{settings.tagline}</p>
        )}

        <div className="mt-10 space-y-6 text-base leading-relaxed text-foreground/90">
          <p>
            Acreditamos que os acessórios certos têm o poder de transformar um look e revelar a
            personalidade de quem os usa. Cada peça da nossa seleção é escolhida com cuidado,
            pensando em elegância, durabilidade e no detalhe que faz toda a diferença.
          </p>
          <p>
            Valorizamos o bom design e o acabamento bem-feito. Por isso, buscamos peças que unem
            beleza e qualidade, para que você possa usá-las no dia a dia ou guardá-las para ocasiões
            especiais, com a confiança de que foram feitas para durar.
          </p>
          <p>
            Mais do que vender acessórios, queremos fazer parte dos seus momentos, ajudando a compor
            looks que expressem quem você é, com leveza e sofisticação.
          </p>
          <p>
            Estamos sempre à disposição para ajudar você a encontrar a peça perfeita. Fique à
            vontade para explorar nossa loja e entrar em contato sempre que precisar.
          </p>
        </div>
      </div>
    </div>
  )
}
