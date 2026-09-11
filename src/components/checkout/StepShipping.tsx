import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { cn, formatCurrencyBRL } from '@/lib/utils'
import { calcShippingCostPreview } from '@/features/checkout/shipping'
import { fetchShippingQuotes, type ShippingQuote } from '@/services/shipping'
import type { ShippingMethod } from '@/features/checkout/types'

const FIXED_METHOD_LABELS: Record<'pickup' | 'local_delivery' | 'free', string> = {
  pickup: 'Retirada na loja',
  local_delivery: 'Entrega local',
  free: 'Frete grátis',
}

interface StepShippingProps {
  value: ShippingMethod | null
  onChange: (value: ShippingMethod) => void
  subtotalCents: number
  cepDestino: string
  items: { product_id: string; quantity: number }[]
  quote: ShippingQuote | null
  onQuoteChange: (quote: ShippingQuote | null) => void
  onNext: () => void
  onBack: () => void
}

export function StepShipping({
  value,
  onChange,
  subtotalCents,
  cepDestino,
  items,
  quote,
  onQuoteChange,
  onNext,
  onBack,
}: StepShippingProps) {
  const { settings } = useSiteSettings()
  const standardRule = settings.freight_rules.standard
  const fixedMethods = (['pickup', 'local_delivery', 'free'] as const).filter(
    (method) => settings.freight_rules[method].enabled,
  )

  const quotesQuery = useQuery({
    queryKey: ['shipping-quotes', cepDestino, items],
    queryFn: () => fetchShippingQuotes({ items, cepDestino }),
    enabled: standardRule.enabled && cepDestino.replace(/\D/g, '').length === 8,
    retry: false,
  })

  const realQuotes = quotesQuery.data ?? []
  const useFallbackFlatRate = standardRule.enabled && quotesQuery.isFetched && realQuotes.length === 0

  function selectFixedMethod(method: 'pickup' | 'local_delivery' | 'free') {
    onQuoteChange(null)
    onChange(method)
  }

  function selectQuote(option: ShippingQuote) {
    onQuoteChange(option)
    onChange('standard')
  }

  function selectFallbackStandard() {
    onQuoteChange(null)
    onChange('standard')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {fixedMethods.map((method) => {
          const cost = calcShippingCostPreview(settings.freight_rules[method], subtotalCents)
          return (
            <button
              key={method}
              type="button"
              onClick={() => selectFixedMethod(method)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border p-4 text-left',
                value === method && !quote ? 'border-primary bg-primary/5' : 'hover:border-primary',
              )}
            >
              <span className="font-medium">{FIXED_METHOD_LABELS[method]}</span>
              <span className={cn('text-sm', cost === 0 && 'font-medium text-success')}>
                {cost === 0 ? 'Grátis' : formatCurrencyBRL(cost)}
              </span>
            </button>
          )
        })}

        {standardRule.enabled && quotesQuery.isLoading && (
          <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculando frete para o seu CEP...
          </div>
        )}

        {standardRule.enabled &&
          realQuotes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectQuote(option)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border p-4 text-left',
                quote?.id === option.id ? 'border-primary bg-primary/5' : 'hover:border-primary',
              )}
            >
              <span className="font-medium">
                {option.service_name} — {option.carrier_name}
                {option.deadline_days != null && (
                  <span className="ml-1 text-sm text-muted-foreground">
                    ({option.deadline_days} dia{option.deadline_days === 1 ? '' : 's'})
                  </span>
                )}
              </span>
              <span className="text-sm">{formatCurrencyBRL(option.cost_cents)}</span>
            </button>
          ))}

        {useFallbackFlatRate && (
          <button
            type="button"
            onClick={selectFallbackStandard}
            className={cn(
              'flex w-full items-center justify-between rounded-md border p-4 text-left',
              value === 'standard' && !quote ? 'border-primary bg-primary/5' : 'hover:border-primary',
            )}
          >
            <span className="font-medium">Envio padrão</span>
            <span className="text-sm">
              {formatCurrencyBRL(calcShippingCostPreview(standardRule, subtotalCents))}
            </span>
          </button>
        )}

        {fixedMethods.length === 0 && !standardRule.enabled && (
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
