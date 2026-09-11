import { supabase } from '@/lib/supabase'

export interface ShippingQuote {
  id: string
  carrier_name: string
  service_name: string
  cost_cents: number
  deadline_days: number | null
}

export interface FetchShippingQuotesParams {
  items: { product_id: string; quantity: number }[]
  cepDestino: string
}

// Cotação real de frete via Edge Function calculate-shipping-quote (Melhor
// Envio). O quote_id retornado deve ser enviado a createOrder — o backend
// (public.create_order) é quem valida e usa esse valor como fonte da
// verdade, nunca um cálculo feito aqui no frontend.
export async function fetchShippingQuotes(
  params: FetchShippingQuotesParams,
): Promise<ShippingQuote[]> {
  const { data, error } = await supabase.functions.invoke('calculate-shipping-quote', {
    body: {
      items: params.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      cep_destino: params.cepDestino.replace(/\D/g, ''),
    },
  })
  if (error) throw error
  return (data?.quotes ?? []) as ShippingQuote[]
}
