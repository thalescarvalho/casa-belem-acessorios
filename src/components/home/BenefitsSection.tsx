import { CreditCard, Headset, RefreshCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import type { SiteBenefit } from '@/contexts/SiteSettingsContext'

const ICONS: Record<string, typeof Sparkles> = {
  'shield-check': ShieldCheck,
  'credit-card': CreditCard,
  truck: Truck,
  headset: Headset,
  'refresh-ccw': RefreshCcw,
}

export function BenefitsSection({ benefits }: { benefits: SiteBenefit[] }) {
  if (benefits.length === 0) return null

  return (
    <section className="border-y bg-secondary/40">
      <div className="container grid grid-cols-2 gap-6 py-10 sm:grid-cols-3 lg:grid-cols-5">
        {benefits.map((benefit) => {
          const Icon = ICONS[benefit.icon] ?? Sparkles
          return (
            <div key={benefit.title} className="flex flex-col items-center gap-2 text-center">
              <Icon className="h-7 w-7 text-primary" />
              <span className="text-sm font-semibold">{benefit.title}</span>
              <span className="text-xs text-muted-foreground">{benefit.description}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
