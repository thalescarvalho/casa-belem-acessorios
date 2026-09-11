// Edge Function: mercadopago-webhook
//
// Recebe as notificações de pagamento do Mercado Pago. NUNCA confia no
// status enviado no corpo da notificação — sempre busca o pagamento
// novamente na API do Mercado Pago (fonte de verdade) antes de atualizar o
// pedido. Valida a assinatura do webhook (header x-signature) usando
// MERCADOPAGO_WEBHOOK_SECRET antes de processar qualquer coisa.
//
// Referência de assinatura:
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/notifications/webhooks#editor_5

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts'
import { fetchMercadoPagoPayment, mapMercadoPagoStatus } from '../_shared/mercadopago.ts'

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')
  if (!secret) {
    console.warn(
      'MERCADOPAGO_WEBHOOK_SECRET não configurado — pulando verificação (NÃO recomendado em produção).',
    )
    return true
  }

  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key.trim(), value?.trim()]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHex === v1
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const url = new URL(req.url)
    let dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id')
    let type = url.searchParams.get('type') ?? url.searchParams.get('topic')

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)
      if (body?.data?.id) dataId = String(body.data.id)
      if (body?.type) type = body.type
    }

    if (!dataId) {
      return jsonResponse({ error: 'Notificação sem data.id.' }, 400)
    }

    if (type && type !== 'payment') {
      return jsonResponse({ ok: true, ignored: type })
    }

    const isValid = await verifySignature(req, dataId)
    if (!isValid) {
      console.error('Assinatura do webhook inválida.')
      return jsonResponse({ error: 'Assinatura inválida.' }, 401)
    }

    const mpPayment = await fetchMercadoPagoPayment(dataId)
    const orderId = mpPayment.external_reference as string | undefined
    if (!orderId) {
      return jsonResponse({ ok: true, note: 'Pagamento sem external_reference, ignorado.' })
    }

    const status = mapMercadoPagoStatus(mpPayment.status)
    const supabase = createSupabaseAdminClient()

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ status, raw_payload: mpPayment })
      .eq('provider', 'mercadopago')
      .eq('provider_payment_id', String(mpPayment.id))
    if (paymentUpdateError) throw paymentUpdateError

    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .maybeSingle()

    if (order && order.status === 'awaiting_payment') {
      if (status === 'approved') {
        await supabase.from('orders').update({ status: 'payment_approved' }).eq('id', orderId)
      } else if (status === 'refunded') {
        await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)
      }
    }

    return jsonResponse({ ok: true })
  } catch (error) {
    console.error('mercadopago-webhook error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
