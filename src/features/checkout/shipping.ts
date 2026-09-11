import type { FreightRule } from '@/contexts/SiteSettingsContext'

// Espelha (para exibição no frontend) a mesma regra usada em
// supabase/migrations/20260101001200_order_functions.sql::calculate_shipping.
// O backend SEMPRE recalcula de forma autoritativa ao criar o pedido — esta
// função serve apenas para mostrar uma prévia ao cliente antes do envio.
export function calcShippingCostPreview(
  rule: FreightRule | undefined,
  subtotalCents: number,
): number {
  if (!rule || !rule.enabled) return 0
  if (rule.free_above_cents != null && subtotalCents >= rule.free_above_cents) return 0
  return rule.cost_cents
}
