// Edge Function: calculate-shipping-quote
//
// Cotação real de frete (Melhor Envio) para o método "standard" do checkout.
// Peso e dimensões vêm SEMPRE do produto cadastrado no banco — nunca do que o
// frontend informar — para impedir que o cliente manipule o cálculo. Cada
// opção retornada (PAC, SEDEX, etc.) é gravada em public.shipping_quotes com
// validade de 30 minutos; public.create_order valida essa cotação antes de
// usá-la como shipping_cents do pedido (ver
// supabase/migrations/20260101001900_shipping_quotes.sql).

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts'
import { fetchMelhorEnvioQuote, type MelhorEnvioProduct } from '../_shared/melhorEnvio.ts'

interface RequestBody {
  items: { product_id: string; quantity: number }[]
  cep_destino: string
}

const QUOTE_TTL_MINUTES = 30

// Fallback quando o produto ainda não tem peso/dimensões cadastrados
// (embalagem pequena tipo joia/bijuteria) — configure os valores reais em
// /admin/produtos para cotações precisas.
const FALLBACK_WEIGHT_GRAMS = 300
const FALLBACK_LENGTH_CM = 16
const FALLBACK_WIDTH_CM = 11
const FALLBACK_HEIGHT_CM = 2

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const body = (await req.json()) as RequestBody
    const cepDestino = (body?.cep_destino ?? '').replace(/\D/g, '')
    if (cepDestino.length !== 8) {
      return jsonResponse({ error: 'CEP de destino inválido.' }, 400)
    }
    if (!body?.items || body.items.length === 0) {
      return jsonResponse({ error: 'Carrinho vazio.' }, 400)
    }

    const supabase = createSupabaseAdminClient()

    const { data: settingRow, error: settingError } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping_origin')
      .maybeSingle()
    if (settingError) throw settingError

    const cepOrigem = (
      (settingRow?.value as { cep?: string } | null)?.cep ?? ''
    ).replace(/\D/g, '')
    if (cepOrigem.length !== 8) {
      return jsonResponse(
        { error: 'CEP de origem não configurado. Defina-o em /admin/configuracoes → Frete.' },
        409,
      )
    }

    const productIds = [...new Set(body.items.map((i) => i.product_id))]
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price_cents, sale_price_cents, weight_grams, length_cm, width_cm, height_cm')
      .in('id', productIds)
    if (productsError) throw productsError

    const productById = new Map((products ?? []).map((p) => [p.id, p]))
    let totalWeightGrams = 0

    const meProducts: MelhorEnvioProduct[] = body.items.map((item) => {
      const product = productById.get(item.product_id)
      if (!product) throw new Error(`Produto ${item.product_id} não encontrado.`)

      const weightGrams = product.weight_grams ?? FALLBACK_WEIGHT_GRAMS
      totalWeightGrams += weightGrams * item.quantity

      return {
        id: product.id,
        quantity: item.quantity,
        weight: weightGrams / 1000,
        length: Number(product.length_cm ?? FALLBACK_LENGTH_CM),
        width: Number(product.width_cm ?? FALLBACK_WIDTH_CM),
        height: Number(product.height_cm ?? FALLBACK_HEIGHT_CM),
        insurance_value: (product.sale_price_cents ?? product.price_cents) / 100,
      }
    })

    const options = await fetchMelhorEnvioQuote({
      cepOrigem,
      cepDestino,
      products: meProducts,
    })

    const validOptions = options.filter((o) => !o.error && o.price)
    if (validOptions.length === 0) {
      return jsonResponse(
        { error: 'Nenhuma opção de frete disponível para este CEP no momento.' },
        409,
      )
    }

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000).toISOString()

    const rowsToInsert = validOptions.map((o) => ({
      cep_destino: cepDestino,
      carrier_name: o.company.name,
      service_name: o.name,
      cost_cents: Math.round(Number(o.price) * 100),
      deadline_days: o.delivery_time ?? null,
      weight_grams: totalWeightGrams,
      raw_response: o,
      expires_at: expiresAt,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('shipping_quotes')
      .insert(rowsToInsert)
      .select('id, carrier_name, service_name, cost_cents, deadline_days')
    if (insertError) throw insertError

    return jsonResponse({ quotes: inserted })
  } catch (error) {
    console.error('calculate-shipping-quote error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
