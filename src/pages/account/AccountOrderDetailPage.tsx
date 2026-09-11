import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PackageX, Truck } from 'lucide-react'
import { fetchOrderByNumber, fetchOrderItems, fetchOrderStatusHistory } from '@/services/orders'
import { paths } from '@/routes/paths'
import { formatCurrencyBRL } from '@/lib/utils'
import { buildTrackingUrl } from '@/utils/tracking'
import { orderStatusMeta } from '@/pages/account/AccountOrdersPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ShippingAddress {
  recipient_name: string
  cep: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AccountOrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()

  const orderQuery = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => fetchOrderByNumber(orderNumber!),
    enabled: Boolean(orderNumber),
  })

  const order = orderQuery.data

  const itemsQuery = useQuery({
    queryKey: ['order-items', order?.id],
    queryFn: () => fetchOrderItems(order!.id),
    enabled: Boolean(order),
  })

  const historyQuery = useQuery({
    queryKey: ['order-history', order?.id],
    queryFn: () => fetchOrderStatusHistory(order!.id),
    enabled: Boolean(order),
  })

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <PackageX className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild>
          <Link to={paths.accountOrders}>Voltar para meus pedidos</Link>
        </Button>
      </div>
    )
  }

  const meta = orderStatusMeta[order.status]
  const address = order.shipping_address as unknown as ShippingAddress | null
  const items = itemsQuery.data ?? []
  const history = historyQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Pedido {order.order_number}</h2>
          <p className="text-sm text-muted-foreground">
            Realizado em {formatDateTime(order.created_at)}
          </p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <div className="rounded-lg border">
        <div className="p-4">
          <h3 className="font-medium">Itens do pedido</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Qtd.</TableHead>
              <TableHead className="text-right">Preço unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrencyBRL(item.unit_price_cents)}
                </TableCell>
                <TableCell className="text-right">{formatCurrencyBRL(item.total_cents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {order.tracking_code && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-medium">
            <Truck className="h-4 w-4" /> Rastreamento
          </h3>
          <p className="text-sm text-muted-foreground">
            {order.carrier ? `${order.carrier} — ` : ''}
            <span className="font-medium text-foreground">{order.tracking_code}</span>
          </p>
          {(order.tracking_url ?? buildTrackingUrl(order.carrier, order.tracking_code)) && (
            <a
              href={order.tracking_url ?? buildTrackingUrl(order.carrier, order.tracking_code)!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-primary underline"
            >
              Rastrear entrega
            </a>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Endereço de entrega</h3>
          {address ? (
            <p className="text-sm text-muted-foreground">
              {address.recipient_name}
              <br />
              {address.street}, {address.number}
              {address.complement ? ` - ${address.complement}` : ''}
              <br />
              {address.neighborhood} - {address.city}/{address.state}
              <br />
              CEP {address.cep}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Endereço não informado.</p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyBRL(order.subtotal_cents)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto</span>
                <span>-{formatCurrencyBRL(order.discount_cents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatCurrencyBRL(order.shipping_cents)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrencyBRL(order.total_cents)}</span>
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 font-medium">Histórico do pedido</h3>
          <ol className="space-y-4 border-l pl-4">
            {history.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm font-medium">
                  {orderStatusMeta[entry.status as keyof typeof orderStatusMeta]?.label ??
                    entry.status}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
