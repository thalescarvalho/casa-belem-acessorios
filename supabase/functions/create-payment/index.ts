// Edge Function: create-payment
//
// Cria uma cobrança (PIX ou cartão) no Mercado Pago para um pedido já
// existente (criado via public.create_order). O valor cobrado é SEMPRE lido
// do pedido no banco (orders.total_cents) — nunca do payload enviado pelo
// cliente — para impedir que o frontend determine o valor pago (seção 11 do
// briefing).
//
// Espera POST { order_id: string, form_data: Record<string, unknown> }, onde
// form_data é o objeto devolvido pelo callback onSubmit do Payment Brick do
// Mercado Pago (@mercadopago/sdk-react) no frontend.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts'
import { getMercadoPagoAccessToken, mapMercadoPagoStatus } from '../_shared/mercadopago.ts'

interface RequestBody {
  order_id: string
  form_data: {
    payment_method_id?: string
    token?: string
    issuer_id?: string
    installments?: number
    payer?: {
      email?: string
      first_name?: string
      last_name?: string
      identification?: { type: string; number: string }
    }
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const body = (await req.json()) as RequestBody
    if (!body?.order_id || !body?.form_data) {
      return jsonResponse({ error: 'order_id e form_data são obrigatórios.' }, 400)
    }

    const supabase = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total_cents, status, guest_email')
      .eq('id', body.order_id)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return jsonResponse({ error: 'Pedido não encontrado.' }, 404)
    if (order.status !== 'awaiting_payment') {
      return jsonResponse(
        { error: `Pedido não está aguardando pagamento (status atual: ${order.status}).` },
        409,
      )
    }

    const { data: existingApproved } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .eq('status', 'approved')
      .maybeSingle()
    if (existingApproved) {
      return jsonResponse({ error: 'Este pedido já possui um pagamento aprovado.' }, 409)
    }

    const isPix =
      body.form_data.payment_method_id === 'pix' ||
      body.form_data.payment_method_id === 'bank_transfer'
    const transactionAmount = order.total_cents / 100

    const payerEmail = body.form_data.payer?.email || order.guest_email || undefined

    const mpPayload: Record<string, unknown> = {
      transaction_amount: transactionAmount,
      description: `Pedido ${order.order_number}`,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      payer: {
        email: payerEmail,
        first_name: body.form_data.payer?.first_name,
        last_name: body.form_data.payer?.last_name,
        identification: body.form_data.payer?.identification,
      },
    }

    if (isPix) {
      mpPayload.payment_method_id = 'pix'
    } else {
      mpPayload.token = body.form_data.token
      mpPayload.installments = body.form_data.installments ?? 1
      mpPayload.payment_method_id = body.form_data.payment_method_id
      mpPayload.issuer_id = body.form_data.issuer_id
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(mpPayload),
    })

    const mpPayment = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('Erro do Mercado Pago:', mpPayment)
      return jsonResponse(
        { error: mpPayment?.message ?? 'Não foi possível processar o pagamento no Mercado Pago.' },
        502,
      )
    }

    const status = mapMercadoPagoStatus(mpPayment.status)
    const qrCode = mpPayment.point_of_interaction?.transaction_data?.qr_code ?? null
    const qrCodeBase64 = mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const ticketUrl = mpPayment.point_of_interaction?.transaction_data?.ticket_url ?? null

    const { error: paymentInsertError } = await supabase.from('payments').insert({
      order_id: order.id,
      provider: 'mercadopago',
      provider_payment_id: String(mpPayment.id),
      method: isPix ? 'pix' : 'credit_card',
      status,
      amount_cents: order.total_cents,
      installments: isPix ? 1 : (body.form_data.installments ?? 1),
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: ticketUrl,
      raw_payload: mpPayment,
    })
    if (paymentInsertError) throw paymentInsertError

    if (status === 'approved') {
      await supabase.from('orders').update({ status: 'payment_approved' }).eq('id', order.id)
    }

    return jsonResponse({
      status,
      method: isPix ? 'pix' : 'credit_card',
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: ticketUrl,
      status_detail: mpPayment.status_detail ?? null,
    })
  } catch (error) {
    console.error('create-payment error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
