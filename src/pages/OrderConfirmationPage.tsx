import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Copy, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { fetchOrderByNumber } from '@/services/orders'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { formatCurrencyBRL } from '@/lib/utils'
import { paths } from '@/routes/paths'
import type { CreatePaymentResult } from '@/services/payments'

interface LocationState {
  orderNumber: string
  totalCents: number
  payment: CreatePaymentResult
}

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const state = location.state as LocationState | null

  const orderQuery = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => fetchOrderByNumber(orderNumber),
    enabled: Boolean(user),
  })

  const totalCents = state?.totalCents ?? orderQuery.data?.total_cents ?? null
  const payment = state?.payment ?? null

  return (
    <div className="container flex flex-col items-center py-16 text-center">
      {payment?.status === 'rejected' ? (
        <XCircle className="h-14 w-14 text-destructive" />
      ) : payment?.status === 'approved' ? (
        <CheckCircle2 className="h-14 w-14 text-success" />
      ) : (
        <Clock className="h-14 w-14 text-primary" />
      )}

      <h1 className="mt-4 font-display text-3xl font-semibold">
        {payment?.status === 'approved' ? 'Pagamento aprovado!' : 'Pedido recebido!'}
      </h1>
      <p className="mt-2 text-muted-foreground">Pedido nº {orderNumber}</p>
      {totalCents !== null && (
        <p className="mt-1 text-lg font-semibold">{formatCurrencyBRL(totalCents)}</p>
      )}

      {payment?.method === 'pix' && payment.status === 'pending' && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border p-6">
          <p className="font-medium">Escaneie o QR Code para pagar via PIX</p>
          {payment.qr_code_base64 && (
            <img
              src={`data:image/png;base64,${payment.qr_code_base64}`}
              alt="QR Code PIX"
              className="h-48 w-48 rounded-md border"
            />
          )}
          {payment.qr_code && (
            <div className="flex w-full max-w-sm items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                {payment.qr_code}
              </code>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(payment.qr_code!)
                  toast.success('Código copiado!')
                }}
                aria-label="Copiar código PIX"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Assim que o pagamento for confirmado, você receberá a atualização do pedido.
          </p>
        </div>
      )}

      {!state && !user && (
        <p className="mt-6 max-w-sm text-sm text-muted-foreground">
          Guarde o número do pedido acima. Como a compra foi feita como visitante, os detalhes
          completos não ficam disponíveis nesta página após sair dela — entre em contato caso
          precise de suporte.
        </p>
      )}

      <div className="mt-8 flex gap-3">
        <Button asChild variant="outline">
          <Link to={paths.products}>Continuar comprando</Link>
        </Button>
        {user && (
          <Button asChild>
            <Link to={paths.accountOrders}>Ver meus pedidos</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
