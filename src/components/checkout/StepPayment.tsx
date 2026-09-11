import * as React from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createPayment, type CreatePaymentResult } from '@/services/payments'

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY
let mercadoPagoInitialized = false

if (publicKey && !mercadoPagoInitialized) {
  initMercadoPago(publicKey, { locale: 'pt-BR' })
  mercadoPagoInitialized = true
}

interface StepPaymentProps {
  orderId: string
  amountCents: number
  payerEmail: string
  onResult: (result: CreatePaymentResult) => void
  onBack: () => void
}

export function StepPayment({
  orderId,
  amountCents,
  payerEmail,
  onResult,
  onBack,
}: StepPaymentProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Pagamento ainda não configurado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Defina <code>VITE_MERCADOPAGO_PUBLIC_KEY</code> (e as secrets da Edge Function) para
          habilitar PIX e cartão. Veja o .env.example.
        </p>
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Payment
        key={orderId}
        initialization={{ amount: amountCents / 100, payer: { email: payerEmail } }}
        customization={{
          paymentMethods: { creditCard: 'all', bankTransfer: 'all' },
          visual: { hideFormTitle: true, style: { theme: 'default' } },
        }}
        onReady={() => setIsSubmitting(false)}
        onError={(error) => {
          console.error('Erro no Payment Brick:', error)
          toast.error('Não foi possível carregar o formulário de pagamento.')
        }}
        onSubmit={async ({ formData }) => {
          setIsSubmitting(true)
          try {
            const result = await createPayment({
              orderId,
              formData: formData as unknown as Record<string, unknown>,
            })
            onResult(result)
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Não foi possível processar o pagamento.',
            )
            throw error
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
      <div className="mt-4">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onBack}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
