import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Upload } from 'lucide-react'
import {
  addProductImage,
  adjustInventory,
  createProduct,
  deleteVariant,
  fetchAdminProductById,
  removeProductImage,
  updateProduct,
  upsertVariant,
  type InventoryRow,
  type ProductImageRow,
  type ProductInsert,
  type ProductRow,
  type ProductVariantRow,
} from '@/services/admin/adminProducts'
import { fetchAllCategoriesAdmin } from '@/services/admin/adminCategories'
import { uploadImage } from '@/services/admin/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/common/PageLoader'
import { formatCurrencyBRL, slugify } from '@/lib/utils'
import { paths } from '@/routes/paths'
import type { Database } from '@/types/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']

type ProductDetail = ProductRow & {
  images: ProductImageRow[]
  variants: ProductVariantRow[]
  inventory: InventoryRow[]
}

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function reaisToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

const productFormSchema = z.object({
  name: z.string().min(1, 'Informe o nome do produto'),
  slug: z.string().min(1, 'Informe o slug'),
  sku: z.string().min(1, 'Informe o SKU'),
  internal_code: z.string(),
  description: z.string(),
  category_id: z.string(),
  priceInput: z.string().min(1, 'Informe o preço'),
  salePriceInput: z.string(),
  weight_grams: z.string(),
  length_cm: z.string(),
  width_cm: z.string(),
  height_cm: z.string(),
  tags: z.string(),
  status: z.enum(['draft', 'active', 'archived']),
  is_featured: z.boolean(),
  is_new: z.boolean(),
  is_bestseller: z.boolean(),
  allow_backorder: z.boolean(),
  min_stock_alert: z.string(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

const emptyFormValues: ProductFormValues = {
  name: '',
  slug: '',
  sku: '',
  internal_code: '',
  description: '',
  category_id: '',
  priceInput: '',
  salePriceInput: '',
  weight_grams: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  tags: '',
  status: 'draft',
  is_featured: false,
  is_new: false,
  is_bestseller: false,
  allow_backorder: false,
  min_stock_alert: '5',
}

function buildPayload(values: ProductFormValues): ProductInsert {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    sku: values.sku.trim(),
    internal_code: values.internal_code.trim() || null,
    description: values.description.trim() || null,
    category_id: values.category_id || null,
    price_cents: reaisToCents(values.priceInput),
    sale_price_cents: values.salePriceInput.trim() ? reaisToCents(values.salePriceInput) : null,
    weight_grams: values.weight_grams.trim() ? Number(values.weight_grams) : null,
    length_cm: values.length_cm.trim() ? Number(values.length_cm) : null,
    width_cm: values.width_cm.trim() ? Number(values.width_cm) : null,
    height_cm: values.height_cm.trim() ? Number(values.height_cm) : null,
    tags: values.tags.trim()
      ? values.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    status: values.status,
    is_featured: values.is_featured,
    is_new: values.is_new,
    is_bestseller: values.is_bestseller,
    allow_backorder: values.allow_backorder,
    min_stock_alert: values.min_stock_alert.trim() ? Number(values.min_stock_alert) : 0,
  }
}

function ProductImagesSection({
  productId,
  images,
}: {
  productId: string
  images: ProductImageRow[]
}) {
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] })

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage('product-images', file)
      await addProductImage(productId, url, images.length === 0, images.length)
      toast.success('Imagem adicionada.')
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagem.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeMutation = useMutation({
    mutationFn: removeProductImage,
    onSuccess: () => {
      toast.success('Imagem removida.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao remover imagem.'),
  })

  const setPrimaryMutation = useMutation({
    mutationFn: async (targetId: string) => {
      for (const image of images) await removeProductImage(image.id)
      for (const image of images)
        await addProductImage(productId, image.url, image.id === targetId, image.sort_order)
    },
    onSuccess: () => {
      toast.success('Imagem principal atualizada.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar imagem principal.'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image) => (
              <div key={image.id} className="relative overflow-hidden rounded-md border">
                <img src={image.url} alt={image.alt ?? ''} className="h-32 w-full object-cover" />
                {image.is_primary && <Badge className="absolute left-1 top-1">Principal</Badge>}
                <div className="flex items-center justify-between gap-1 bg-background/95 p-1">
                  {!image.is_primary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={setPrimaryMutation.isPending}
                      onClick={() => setPrimaryMutation.mutate(image.id)}
                    >
                      Tornar principal
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(image.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Adicionar imagem'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface VariantDraft {
  name: string
  sku: string
  priceDeltaInput: string
}

const emptyVariantDraft: VariantDraft = { name: '', sku: '', priceDeltaInput: '0,00' }

function ProductVariantsSection({
  productId,
  variants,
}: {
  productId: string
  variants: ProductVariantRow[]
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = React.useState<VariantDraft>(emptyVariantDraft)
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] })

  const upsertMutation = useMutation({
    mutationFn: upsertVariant,
    onSuccess: () => {
      toast.success('Variação salva.')
      setDraft(emptyVariantDraft)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar variação.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVariant,
    onSuccess: () => {
      toast.success('Variação removida.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao remover variação.'),
  })

  function handleAdd() {
    if (!draft.name.trim()) {
      toast.error('Informe o nome da variação.')
      return
    }
    upsertMutation.mutate({
      product_id: productId,
      name: draft.name.trim(),
      sku: draft.sku.trim() || null,
      price_delta_cents: reaisToCents(draft.priceDeltaInput),
      attributes: {},
      active: true,
    })
  }

  function handleToggleActive(variant: ProductVariantRow) {
    upsertMutation.mutate({
      id: variant.id,
      product_id: variant.product_id,
      name: variant.name,
      sku: variant.sku,
      price_delta_cents: variant.price_delta_cents,
      attributes: variant.attributes,
      active: !variant.active,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variants.length > 0 && (
          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
              >
                <div>
                  <p className="text-sm font-medium">{variant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {variant.sku ?? 'sem SKU'} · {formatCurrencyBRL(variant.price_delta_cents)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={variant.active}
                    onCheckedChange={() => handleToggleActive(variant)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(variant.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ex: Prata 925 / P"
            />
          </div>
          <div>
            <Label>SKU</Label>
            <Input
              value={draft.sku}
              onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            />
          </div>
          <div>
            <Label>Ajuste de preço (R$)</Label>
            <Input
              value={draft.priceDeltaInput}
              onChange={(e) => setDraft((d) => ({ ...d, priceDeltaInput: e.target.value }))}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={upsertMutation.isPending}
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Adicionar variação
        </Button>
      </CardContent>
    </Card>
  )
}

function InventoryRowEditor({ inventory, label }: { inventory: InventoryRow; label: string }) {
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = React.useState(String(inventory.quantity))
  const [reason, setReason] = React.useState('Ajuste manual')

  const mutation = useMutation({
    mutationFn: () =>
      adjustInventory(inventory.id, Number(quantity), reason.trim() || 'Ajuste manual'),
    onSuccess: () => {
      toast.success('Estoque atualizado.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', inventory.product_id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao ajustar estoque.'),
  })

  return (
    <div className="grid items-end gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">Reservado: {inventory.reserved_quantity}</p>
      </div>
      <div>
        <Label>Quantidade</Label>
        <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div>
        <Label>Motivo</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Salvar estoque
      </Button>
    </div>
  )
}

function ProductInventorySection({
  inventory,
  variants,
}: {
  inventory: InventoryRow[]
  variants: ProductVariantRow[]
}) {
  const base = inventory.find((inv) => inv.variant_id === null)
  const variantInventories = inventory.filter((inv) => inv.variant_id !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {base && <InventoryRowEditor inventory={base} label="Produto base" />}
        {variantInventories.map((inv) => {
          const variant = variants.find((v) => v.id === inv.variant_id)
          return (
            <InventoryRowEditor
              key={inv.id}
              inventory={inv}
              label={variant ? variant.name : 'Variação'}
            />
          )
        })}
        {!base && variantInventories.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum registro de estoque encontrado.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [slugTouched, setSlugTouched] = React.useState(false)

  const productQuery = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => fetchAdminProductById(id as string),
    enabled: isEditMode,
  })
  const product = productQuery.data as ProductDetail | undefined

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchAllCategoriesAdmin,
  })
  const categories = (categoriesQuery.data ?? []) as CategoryRow[]

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyFormValues,
  })

  React.useEffect(() => {
    if (!product) return
    reset({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      internal_code: product.internal_code ?? '',
      description: product.description ?? '',
      category_id: product.category_id ?? '',
      priceInput: centsToReaisInput(product.price_cents),
      salePriceInput: product.sale_price_cents ? centsToReaisInput(product.sale_price_cents) : '',
      weight_grams: product.weight_grams ? String(product.weight_grams) : '',
      length_cm: product.length_cm ? String(product.length_cm) : '',
      width_cm: product.width_cm ? String(product.width_cm) : '',
      height_cm: product.height_cm ? String(product.height_cm) : '',
      tags: product.tags?.join(', ') ?? '',
      status: product.status,
      is_featured: product.is_featured,
      is_new: product.is_new,
      is_bestseller: product.is_bestseller,
      allow_backorder: product.allow_backorder,
      min_stock_alert: String(product.min_stock_alert),
    })
    setSlugTouched(true)
  }, [product, reset])

  const nameValue = watch('name')
  React.useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(nameValue || ''))
  }, [nameValue, slugTouched, setValue])

  const createMutation = useMutation({
    mutationFn: async (payload: ProductInsert) => (await createProduct(payload)) as ProductRow,
    onSuccess: (data) => {
      toast.success('Produto criado. Agora adicione imagens e variações.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      navigate(paths.adminProduct(data.id), { replace: true })
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao criar produto.'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ProductInsert) => updateProduct(id as string, payload),
    onSuccess: () => {
      toast.success('Produto atualizado.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', id] })
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar produto.'),
  })

  function onSubmit(values: ProductFormValues) {
    const payload = buildPayload(values)
    if (isEditMode) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isEditMode && productQuery.isPending) {
    return <PageLoader />
  }

  if (isEditMode && productQuery.isFetched && !productQuery.data) {
    return <p className="text-sm text-muted-foreground">Produto não encontrado.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {isEditMode ? 'Editar produto' : 'Novo produto'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? 'Atualize as informações do produto.'
            : 'Preencha os dados para cadastrar um novo produto.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                {...register('slug', {
                  onChange: () => setSlugTouched(true),
                })}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div>
              <Label htmlFor="internal_code">Código interno</Label>
              <Input id="internal_code" {...register('internal_code')} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={4} {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preço e estoque mínimo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="priceInput">Preço (R$)</Label>
              <Input
                id="priceInput"
                inputMode="decimal"
                placeholder="0,00"
                {...register('priceInput')}
              />
              {errors.priceInput && (
                <p className="text-xs text-destructive">{errors.priceInput.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="salePriceInput">Preço promocional (R$)</Label>
              <Input
                id="salePriceInput"
                inputMode="decimal"
                placeholder="0,00"
                {...register('salePriceInput')}
              />
            </div>
            <div>
              <Label htmlFor="min_stock_alert">Alerta de estoque mínimo</Label>
              <Input id="min_stock_alert" type="number" min={0} {...register('min_stock_alert')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimensões e peso</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="weight_grams">Peso (g)</Label>
              <Input id="weight_grams" type="number" min={0} {...register('weight_grams')} />
            </div>
            <div>
              <Label htmlFor="length_cm">Comprimento (cm)</Label>
              <Input id="length_cm" type="number" min={0} {...register('length_cm')} />
            </div>
            <div>
              <Label htmlFor="width_cm">Largura (cm)</Label>
              <Input id="width_cm" type="number" min={0} {...register('width_cm')} />
            </div>
            <div>
              <Label htmlFor="height_cm">Altura (cm)</Label>
              <Input id="height_cm" type="number" min={0} {...register('height_cm')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="prata, banhado a ouro, presente"
              />
            </div>
            <div className="max-w-xs">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  control={control}
                  name="is_featured"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Produto em destaque
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  control={control}
                  name="is_new"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Produto novo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  control={control}
                  name="is_bestseller"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Mais vendido
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Controller
                  control={control}
                  name="allow_backorder"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Permitir venda sem estoque
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEditMode ? 'Salvar alterações' : 'Criar produto'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(paths.adminProducts)}>
            Cancelar
          </Button>
        </div>
      </form>

      {isEditMode && product && (
        <div className="space-y-6">
          <ProductImagesSection productId={product.id} images={product.images} />
          <ProductVariantsSection productId={product.id} variants={product.variants} />
          <ProductInventorySection inventory={product.inventory} variants={product.variants} />
        </div>
      )}
    </div>
  )
}
