export type InternalPaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'

// Mapeia o status detalhado do Mercado Pago para o vocabulário interno usado
// em public.payments.status / public.orders.status. Referência:
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-management/payment-status
export function mapMercadoPagoStatus(mpStatus: string): InternalPaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    case 'pending':
    case 'authorized':
    case 'in_process':
    case 'in_mediation':
    default:
      return 'pending'
  }
}

export function getMercadoPagoAccessToken(): string {
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado nas secrets da function.')
  return token
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${getMercadoPagoAccessToken()}` },
  })
  if (!response.ok) {
    throw new Error(
      `Falha ao consultar pagamento ${paymentId} no Mercado Pago (${response.status}).`,
    )
  }
  return response.json()
}
