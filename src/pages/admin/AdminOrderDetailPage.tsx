import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import {
  cancelOrder,
  fetchAdminOrderDetail,
  getAvailableNextStatuses,
  updateOrderStatus,
  updateOrderTracking,
} from '@/services/admin/adminOrders'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrencyBRL } from '@/lib/utils'
import { paths } from '@/routes/paths'
import { buildTrackingUrl } from '@/utils/tracking'
import { buildWhatsappUrl } from '@/utils/whatsapp'
import type { Database } from '@/types/database.types'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderStatus = OrderRow['status']
type OrderItemRow = Database['public']['Tables']['order_items']['Row']
type OrderStatusHistoryRow = Database['public']['Tables']['order_status_history']['Row']
type PaymentRow = Database['public']['Tables']['payments']['Row']

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando pagamento',
  payment_approved: 'Pagamento aprovado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

const STATUS_VARIANTS: Record<OrderStatus, BadgeProps['variant']> = {
  awaiting_payment: 'secondary',
  payment_approved: 'default',
  preparing: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

interface ShippingAddress {
  recipient_name: string
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

function parseShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== 'object') return null
  const address = value as Record<string, unknown>
  if (typeof address.street !== 'string') return null
  return {
    recipient_name: String(address.recipient_name ?? ''),
    cep: String(address.cep ?? ''),
    street: String(address.street ?? ''),
    number: String(address.number ?? ''),
    complement: address.complement ? String(address.complement) : null,
    neighborhood: String(address.neighborhood ?? ''),
    city: String(address.city ?? ''),
    state: String(address.state ?? ''),
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [targetStatus, setTargetStatus] = React.useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [trackingCode, setTrackingCode] = React.useState('')
  const [carrier, setCarrier] = React.useState('')

  const orderQuery = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => fetchAdminOrderDetail(id as string),
    enabled: !!id,
  })

  React.useEffect(() => {
    if (orderQuery.data?.order) {
      setTrackingCode(orderQuery.data.order.tracking_code ?? '')
      setCarrier(orderQuery.data.order.carrier ?? '')
    }
  }, [orderQuery.data?.order])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
  }

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(id as string, status as OrderStatus),
    onSuccess: () => {
      toast.success('Status do pedido atualizado.')
      setTargetStatus('')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar status.'),
  })

  const trackingMutation = useMutation({
    mutationFn: () =>
      updateOrderTracking(id as string, {
        trackingCode: trackingCode.trim() || null,
        carrier: carrier.trim() || null,
        trackingUrl: buildTrackingUrl(carrier.trim() || null, trackingCode.trim() || null),
      }),
    onSuccess: () => {
      toast.success('Rastreamento salvo.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar rastreamento.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id as string, cancelReason.trim() || undefined),
    onSuccess: () => {
      toast.success('Pedido cancelado e estoque restaurado.')
      setCancelDialogOpen(false)
      setCancelReason('')
      setTargetStatus('')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao cancelar pedido.'),
  })

  if (orderQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!orderQuery.data?.order) {
    return <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
  }

  const order = orderQuery.data.order as OrderRow
  const items = orderQuery.data.items as OrderItemRow[]
  const history = orderQuery.data.history as OrderStatusHistoryRow[]
  const payments = orderQuery.data.payments as PaymentRow[]
  const { customerPhone, customerName } = orderQuery.data
  const address = parseShippingAddress(order.shipping_address)
  const nextStatuses = getAvailableNextStatuses(order.status) as OrderStatus[]
  const trackingUrl = order.tracking_url ?? buildTrackingUrl(order.carrier, order.tracking_code)

  function handleApplyStatus() {
    if (!targetStatus) return
    if (targetStatus === 'cancelled') {
      setCancelDialogOpen(true)
      return
    }
    updateStatusMutation.mutate(targetStatus)
  }

  function buildWhatsappNotifyUrl(): string | null {
    if (!customerPhone) return null
    const lines = [
      `Olá${customerName ? `, ${customerName}` : ''}! Atualização do seu pedido *${order.order_number}*:`,
      '',
      `Status: *${STATUS_LABELS[order.status]}*`,
    ]
    if (order.tracking_code) {
      lines.push(
        `Código de rastreio: ${order.tracking_code}${order.carrier ? ` (${order.carrier})` : ''}`,
      )
      if (trackingUrl) lines.push(`Rastrear: ${trackingUrl}`)
    }
    return buildWhatsappUrl(customerPhone, lines.join('\n'))
  }

  const whatsappNotifyUrl = buildWhatsappNotifyUrl()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={paths.adminOrders}
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para pedidos
          </Link>
          <h1 className="font-display text-2xl font-semibold">Pedido {order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Criado em {formatDateTime(order.created_at)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status]} className="text-sm">
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alterar status</CardTitle>
        </CardHeader>
        <CardContent>
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este pedido não possui transições de status disponíveis.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleApplyStatus}
                disabled={!targetStatus || updateStatusMutation.isPending}
              >
                Atualizar status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rastreamento e notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tracking-carrier">Transportadora</Label>
              <Input
                id="tracking-carrier"
                placeholder="Ex: Correios"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking-code">Código de rastreio</Label>
              <Input
                id="tracking-code"
                placeholder="Ex: BR123456789BR"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
          </div>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Ver rastreamento
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => trackingMutation.mutate()}
              disabled={trackingMutation.isPending}
            >
              Salvar rastreamento
            </Button>
            <Button
              variant="whatsapp"
              disabled={!whatsappNotifyUrl}
              asChild={Boolean(whatsappNotifyUrl)}
            >
              {whatsappNotifyUrl ? (
                <a href={whatsappNotifyUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Notificar cliente por WhatsApp
                </a>
              ) : (
                <span>
                  <MessageCircle /> Cliente sem telefone cadastrado
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {order.user_id ? (
              <>
                <p className="font-medium">{customerName || 'Cliente cadastrado'}</p>
                {customerPhone && <p className="text-muted-foreground">{customerPhone}</p>}
              </>
            ) : (
              <>
                <p className="font-medium">{order.guest_name ?? 'Não informado'}</p>
                <p className="text-muted-foreground">{order.guest_email}</p>
                <p className="text-muted-foreground">{order.guest_phone}</p>
                <p className="text-muted-foreground">{order.guest_cpf}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço de entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {address ? (
              <>
                <p className="font-medium">{address.recipient_name}</p>
                <p>
                  {address.street}, {address.number}
                  {address.complement ? ` - ${address.complement}` : ''}
                </p>
                <p>{address.neighborhood}</p>
                <p>
                  {address.city} - {address.state}
                </p>
                <p>CEP {address.cep}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Sem endereço de entrega (retirada em loja).</p>
            )}
            <p className="pt-2 text-muted-foreground">Método de envio: {order.shipping_method}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Preço unitário</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrencyBRL(item.unit_price_cents)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyBRL(item.total_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyBRL(order.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <span>-{formatCurrencyBRL(order.discount_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatCurrencyBRL(order.shipping_cents)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>{formatCurrencyBRL(order.total_cents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {payment.method === 'pix' ? 'PIX' : 'Cartão de crédito'}
                    </span>
                    <Badge variant="outline">
                      {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{formatCurrencyBRL(payment.amount_cents)}</p>
                  {payment.installments > 1 && (
                    <p className="text-muted-foreground">{payment.installments}x</p>
                  )}
                  {payment.provider_payment_id && (
                    <p className="text-xs text-muted-foreground">
                      ID: {payment.provider_payment_id}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-primary/40 pl-3 text-sm">
                  <p className="font-medium">
                    {STATUS_LABELS[entry.status as OrderStatus] ?? entry.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </p>
                  {entry.note && <p className="text-muted-foreground">{entry.note}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              O cancelamento restaura o estoque reservado por este pedido. Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento (opcional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
