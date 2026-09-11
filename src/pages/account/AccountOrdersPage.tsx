import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMyOrders, type Order } from '@/services/orders'
import { paths } from '@/routes/paths'
import { formatCurrencyBRL } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const orderStatusMeta: Record<
  Order['status'],
  { label: string; variant: BadgeProps['variant'] }
> = {
  awaiting_payment: { label: 'Aguardando pagamento', variant: 'outline' },
  payment_approved: { label: 'Pagamento aprovado', variant: 'default' },
  preparing: { label: 'Em preparação', variant: 'secondary' },
  shipped: { label: 'Enviado', variant: 'secondary' },
  delivered: { label: 'Entregue', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function AccountOrdersPage() {
  const { user } = useAuth()

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user),
  })

  const orders = ordersQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Meus pedidos</h2>
        <p className="text-sm text-muted-foreground">Acompanhe o status dos seus pedidos</p>
      </div>

      {ordersQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!ordersQuery.isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          <Button asChild>
            <Link to={paths.products}>Ver produtos</Link>
          </Button>
        </div>
      )}

      {orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const meta = orderStatusMeta[order.status]
            return (
              <Link
                key={order.id}
                to={paths.accountOrder(order.order_number)}
                className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="font-semibold">{formatCurrencyBRL(order.total_cents)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
