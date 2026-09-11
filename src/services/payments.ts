import { supabase } from '@/lib/supabase'

export interface CreatePaymentParams {
  orderId: string
  // Corpo devolvido pelo callback onSubmit do Payment Brick do Mercado Pago
  // (@mercadopago/sdk-react) — repassado como veio, a Edge Function monta a
  // chamada real para a API do Mercado Pago usando o access token secreto.
  formData: Record<string, unknown>
}

export interface CreatePaymentResult {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'
  method: 'pix' | 'credit_card'
  qr_code: string | null
  qr_code_base64: string | null
  ticket_url: string | null
  status_detail: string | null
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { order_id: params.orderId, form_data: params.formData },
  })
  if (error) throw error
  return data as CreatePaymentResult
}

export async function fetchPaymentByOrderId(orderId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}
