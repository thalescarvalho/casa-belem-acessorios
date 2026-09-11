import { Button } from '@/components/ui/button'
import { useSiteSettings, type FreightRule } from '@/contexts/SiteSettingsContext'
import { cn, formatCurrencyBRL } from '@/lib/utils'
import { calcShippingCostPreview } from '@/features/checkout/shipping'
import type { ShippingMethod } from '@/features/checkout/types'

const METHOD_LABELS: Record<ShippingMethod, string> = {
  pickup: 'Retirada na loja',
  local_delivery: 'Entrega local',
  standard: 'Envio padrão',
  free: 'Frete grátis',
}

interface StepShippingProps {
  value: ShippingMethod | null
  onChange: (value: ShippingMethod) => void
  subtotalCents: number
  onNext: () => void
  onBack: () => void
}

export function StepShipping({
  value,
  onChange,
  subtotalCents,
  onNext,
  onBack,
}: StepShippingProps) {
  const { settings } = useSiteSettings()
  const methods = Object.entries(settings.freight_rules) as [ShippingMethod, FreightRule][]
  const availableMethods = methods.filter(([, rule]) => rule.enabled)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {availableMethods.map(([method, rule]) => {
          const cost = calcShippingCostPreview(rule, subtotalCents)
          return (
            <button
              key={method}
              type="button"
              onClick={() => onChange(method)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border p-4 text-left',
                value === method ? 'border-primary bg-primary/5' : 'hover:border-primary',
              )}
            >
              <span className="font-medium">{METHOD_LABELS[method]}</span>
              <span className={cn('text-sm', cost === 0 && 'font-medium text-success')}>
                {cost === 0 ? 'Grátis' : formatCurrencyBRL(cost)}
              </span>
            </button>
          )
        })}
        {availableMethods.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum método de entrega está configurado. Configure em /admin/configuracoes.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" disabled={!value} onClick={onNext}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
