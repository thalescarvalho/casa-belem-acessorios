// Edge Function: send-order-email
//
// Chamada pelo gatilho public.notify_order_email() (via pg_net) sempre que um
// pedido é criado ou muda de status. Nunca é chamada diretamente pelo
// frontend. Autenticação: header x-order-email-secret precisa bater com o
// secret ORDER_EMAIL_TRIGGER_SECRET desta function (o mesmo valor configurado
// como app.order_email_secret no banco).

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts'

interface RequestBody {
  order_id: string
  event: string
}

const EVENT_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  order_created: {
    subject: 'Recebemos seu pedido {order_number}',
    heading: 'Pedido recebido!',
    body: 'Assim que o pagamento for confirmado, vamos preparar tudo com carinho.',
  },
  payment_approved: {
    subject: 'Pagamento aprovado — pedido {order_number}',
    heading: 'Pagamento aprovado!',
    body: 'Seu pagamento foi confirmado e o pedido já entrou na fila de preparação.',
  },
  preparing: {
    subject: 'Seu pedido {order_number} está em preparação',
    heading: 'Preparando seu pedido',
    body: 'Estamos separando e embalando os itens do seu pedido.',
  },
  shipped: {
    subject: 'Pedido {order_number} enviado',
    heading: 'Pedido a caminho!',
    body: 'Seu pedido foi enviado.',
  },
  delivered: {
    subject: 'Pedido {order_number} entregue',
    heading: 'Pedido entregue!',
    body: 'Esperamos que você adore. Obrigado pela confiança!',
  },
  cancelled: {
    subject: 'Pedido {order_number} cancelado',
    heading: 'Pedido cancelado',
    body: 'Seu pedido foi cancelado. Qualquer dúvida, entre em contato com a gente.',
  },
  refunded: {
    subject: 'Pedido {order_number} reembolsado',
    heading: 'Reembolso confirmado',
    body: 'O reembolso do seu pedido foi processado.',
  },
}

function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function buildEmailHtml(params: {
  siteName: string
  heading: string
  body: string
  orderNumber: string
  totalCents: number
  trackingCode: string | null
  carrier: string | null
  trackingUrl: string | null
  items: { product_name: string; quantity: number; total_cents: number }[]
}): string {
  const itemsHtml = params.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;">${item.quantity}x ${item.product_name}</td><td style="padding:6px 0;text-align:right;">${formatCurrencyBRL(item.total_cents)}</td></tr>`,
    )
    .join('')

  const trackingHtml = params.trackingCode
    ? `<p style="margin:16px 0;padding:12px;background:#f5f0e8;border-radius:8px;">
         <strong>Rastreamento:</strong> ${params.trackingCode}${params.carrier ? ` (${params.carrier})` : ''}
         ${params.trackingUrl ? `<br/><a href="${params.trackingUrl}" style="color:#7a5230;">Rastrear entrega</a>` : ''}
       </p>`
    : ''

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #2b1d10;">
      <h1 style="font-size: 20px;">${params.heading}</h1>
      <p>${params.body}</p>
      <p style="color:#6b5a48;">Pedido <strong>${params.orderNumber}</strong></p>
      ${trackingHtml}
      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        ${itemsHtml}
        <tr><td style="padding-top:10px; font-weight:bold;">Total</td><td style="padding-top:10px; text-align:right; font-weight:bold;">${formatCurrencyBRL(params.totalCents)}</td></tr>
      </table>
      <p style="margin-top:24px; color:#6b5a48; font-size:12px;">${params.siteName}</p>
    </div>
  `
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  const expectedSecret = Deno.env.get('ORDER_EMAIL_TRIGGER_SECRET')
  const providedSecret = req.headers.get('x-order-email-secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Não autorizado.' }, 401)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY não configurado — pulando envio de e-mail.')
    return jsonResponse({ ok: true, skipped: 'RESEND_API_KEY não configurado.' })
  }

  try {
    const body = (await req.json()) as RequestBody
    const copy = EVENT_COPY[body.event]
    if (!copy) {
      return jsonResponse({ ok: true, skipped: `Evento sem template: ${body.event}` })
    }

    const supabase = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'order_number, total_cents, guest_email, user_id, tracking_code, carrier, tracking_url',
      )
      .eq('id', body.order_id)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) return jsonResponse({ ok: true, skipped: 'Pedido não encontrado.' })

    let recipientEmail = order.guest_email
    if (!recipientEmail && order.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', order.user_id)
        .maybeSingle()
      recipientEmail = profile?.email ?? null
    }
    if (!recipientEmail) return jsonResponse({ ok: true, skipped: 'Pedido sem e-mail de contato.' })

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, total_cents')
      .eq('order_id', body.order_id)

    const { data: siteNameSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_name')
      .maybeSingle()
    const siteName = (siteNameSetting?.value as string) ?? 'Casa Belém Acessórios'

    const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? `${siteName} <onboarding@resend.dev>`

    const html = buildEmailHtml({
      siteName,
      heading: copy.heading,
      body: copy.body,
      orderNumber: order.order_number,
      totalCents: order.total_cents,
      trackingCode: order.tracking_code,
      carrier: order.carrier,
      trackingUrl: order.tracking_url,
      items: items ?? [],
    })

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject: copy.subject.replace('{order_number}', order.order_number),
        html,
      }),
    })

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text()
      console.error('Erro do Resend:', errorBody)
      return jsonResponse({ error: 'Falha ao enviar e-mail.' }, 502)
    }

    return jsonResponse({ ok: true })
  } catch (error) {
    console.error('send-order-email error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
