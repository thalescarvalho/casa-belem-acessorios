import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  deleteProduct,
  duplicateProduct,
  fetchAdminProducts,
  updateProduct,
  type ProductRow,
} from '@/services/admin/adminProducts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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

const PAGE_SIZE = 20

const STATUS_LABELS: Record<ProductRow['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
}

const STATUS_VARIANTS: Record<ProductRow['status'], 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  archived: 'outline',
}

type ProductListItem = ProductRow & {
  categories: { name: string } | null
  inventory: { quantity: number; reserved_quantity: number; variant_id: string | null }[]
}

function availableStock(item: ProductListItem) {
  return item.inventory.reduce(
    (sum, inv) => sum + Math.max(inv.quantity - inv.reserved_quantity, 0),
    0,
  )
}

export function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [productToDelete, setProductToDelete] = React.useState<ProductListItem | null>(null)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const productsQuery = useQuery({
    queryKey: ['admin', 'products', search, page],
    queryFn: () => fetchAdminProducts({ search, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })

  const duplicateMutation = useMutation({
    mutationFn: duplicateProduct,
    onSuccess: () => {
      toast.success('Produto duplicado com sucesso.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao duplicar produto.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success('Produto excluído.')
      setProductToDelete(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao excluir produto.'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductRow['status'] }) =>
      updateProduct(id, { status }),
    onSuccess: () => {
      toast.success('Status atualizado.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar status.'),
  })

  const items = (productsQuery.data?.items ?? []) as ProductListItem[]
  const total = productsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{total} produto(s) cadastrado(s).</p>
        </div>
        <Button asChild>
          <Link to={paths.adminProductNew}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQuery.isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.categories?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    {product.sale_price_cents ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrencyBRL(product.price_cents)}
                        </span>
                        <span className="font-medium">
                          {formatCurrencyBRL(product.sale_price_cents)}
                        </span>
                      </div>
                    ) : (
                      formatCurrencyBRL(product.price_cents)
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        availableStock(product) <= product.min_stock_alert
                          ? 'font-semibold text-destructive'
                          : ''
                      }
                    >
                      {availableStock(product)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[product.status]}>
                        {STATUS_LABELS[product.status]}
                      </Badge>
                      {product.status !== 'archived' && (
                        <Switch
                          checked={product.status === 'active'}
                          onCheckedChange={(checked) =>
                            toggleStatusMutation.mutate({
                              id: product.id,
                              status: checked ? 'active' : 'draft',
                            })
                          }
                          aria-label="Alternar status ativo/rascunho"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="Editar">
                        <Link to={paths.adminProduct(product.id)}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicar"
                        disabled={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(product.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => setProductToDelete(product)}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{productToDelete?.name}</strong>? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => productToDelete && deleteMutation.mutate(productToDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
