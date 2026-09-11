import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  createCoupon,
  deleteCoupon,
  fetchAllCoupons,
  updateCoupon,
  type CouponInsert,
  type CouponRow,
} from '@/services/admin/adminCoupons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function reaisToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}

const TYPE_LABELS: Record<CouponRow['type'], string> = {
  percentage: 'Percentual',
  fixed: 'Valor fixo',
  free_shipping: 'Frete grátis',
}

interface CouponFormState {
  code: string
  type: CouponRow['type']
  value: string
  startsAt: string
  expiresAt: string
  minOrderInput: string
  usageLimit: string
  usageLimitPerCustomer: string
  active: boolean
}

function emptyForm(): CouponFormState {
  return {
    code: '',
    type: 'percentage',
    value: '',
    startsAt: '',
    expiresAt: '',
    minOrderInput: '0,00',
    usageLimit: '',
    usageLimitPerCustomer: '1',
    active: true,
  }
}

function toFormState(coupon: CouponRow): CouponFormState {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    startsAt: toDatetimeLocal(coupon.starts_at),
    expiresAt: toDatetimeLocal(coupon.expires_at),
    minOrderInput: centsToReaisInput(coupon.min_order_cents),
    usageLimit: coupon.usage_limit !== null ? String(coupon.usage_limit) : '',
    usageLimitPerCustomer: String(coupon.usage_limit_per_customer),
    active: coupon.active,
  }
}

export function AdminCouponsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const couponsQuery = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: fetchAllCoupons,
    enabled: isAdmin,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCoupon, setEditingCoupon] = React.useState<CouponRow | null>(null)
  const [form, setForm] = React.useState<CouponFormState>(emptyForm())
  const [couponToDelete, setCouponToDelete] = React.useState<CouponRow | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })

  function openCreateDialog() {
    setEditingCoupon(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEditDialog(coupon: CouponRow) {
    setEditingCoupon(coupon)
    setForm(toFormState(coupon))
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CouponInsert = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === 'free_shipping' ? 0 : Number(form.value) || 0,
        starts_at: fromDatetimeLocal(form.startsAt),
        expires_at: fromDatetimeLocal(form.expiresAt),
        min_order_cents: reaisToCents(form.minOrderInput),
        usage_limit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
        usage_limit_per_customer: form.usageLimitPerCustomer.trim()
          ? Number(form.usageLimitPerCustomer)
          : 1,
        active: form.active,
      }
      if (editingCoupon) return updateCoupon(editingCoupon.id, payload)
      return createCoupon(payload)
    },
    onSuccess: () => {
      toast.success(editingCoupon ? 'Cupom atualizado.' : 'Cupom criado.')
      setDialogOpen(false)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar cupom.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      toast.success('Cupom excluído.')
      setCouponToDelete(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao excluir cupom.'),
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.code.trim()) {
      toast.error('Informe o código do cupom.')
      return
    }
    if (form.type !== 'free_shipping' && (!form.value.trim() || Number(form.value) <= 0)) {
      toast.error('Informe um valor válido para o cupom.')
      return
    }
    saveMutation.mutate()
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem gerenciar cupons.
        </p>
        <Link to={paths.admin} className="text-sm text-primary underline">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  const coupons = couponsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">{coupons.length} cupom(ns) cadastrado(s).</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo cupom
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couponsQuery.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cupom cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TYPE_LABELS[coupon.type]}
                  </TableCell>
                  <TableCell>
                    {coupon.type === 'percentage' && `${coupon.value}%`}
                    {coupon.type === 'fixed' && formatCurrencyBRL(Math.round(coupon.value * 100))}
                    {coupon.type === 'free_shipping' && '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {coupon.expires_at
                      ? new Date(coupon.expires_at).toLocaleDateString('pt-BR')
                      : 'Sem validade'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {coupon.usage_limit ?? '∞'} (max {coupon.usage_limit_per_customer}/cliente)
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.active ? 'default' : 'secondary'}>
                      {coupon.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEditDialog(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => setCouponToDelete(coupon)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coupon-code">Código</Label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, type: value as CouponRow['type'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed">Valor fixo</SelectItem>
                    <SelectItem value="free_shipping">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="coupon-value">
                {form.type === 'percentage' ? 'Valor (%)' : 'Valor (R$)'}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                disabled={form.type === 'free_shipping'}
                value={form.type === 'free_shipping' ? '' : form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === 'free_shipping' ? 'Não aplicável' : ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coupon-starts">Início</Label>
                <Input
                  id="coupon-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="coupon-expires">Expiração</Label>
                <Input
                  id="coupon-expires"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="coupon-min-order">Pedido mínimo (R$)</Label>
                <Input
                  id="coupon-min-order"
                  value={form.minOrderInput}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderInput: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="coupon-usage-limit">Limite total de uso</Label>
                <Input
                  id="coupon-usage-limit"
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="coupon-usage-limit-customer">Limite por cliente</Label>
                <Input
                  id="coupon-usage-limit-customer"
                  type="number"
                  min={1}
                  value={form.usageLimitPerCustomer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usageLimitPerCustomer: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
              <Label>Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cupom</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cupom <strong>{couponToDelete?.code}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => couponToDelete && deleteMutation.mutate(couponToDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
