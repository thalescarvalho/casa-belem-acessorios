import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  createBanner,
  deleteBanner,
  fetchAllBanners,
  updateBanner,
  type BannerInsert,
  type BannerRow,
} from '@/services/admin/adminBanners'
import { uploadImage } from '@/services/admin/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { paths } from '@/routes/paths'

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

interface BannerFormState {
  title: string
  subtitle: string
  desktopImageUrl: string
  mobileImageUrl: string
  buttonLabel: string
  buttonUrl: string
  sortOrder: string
  active: boolean
  startsAt: string
  endsAt: string
}

function emptyForm(): BannerFormState {
  return {
    title: '',
    subtitle: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    buttonLabel: '',
    buttonUrl: '',
    sortOrder: '0',
    active: true,
    startsAt: '',
    endsAt: '',
  }
}

function toFormState(banner: BannerRow): BannerFormState {
  return {
    title: banner.title ?? '',
    subtitle: banner.subtitle ?? '',
    desktopImageUrl: banner.desktop_image_url,
    mobileImageUrl: banner.mobile_image_url ?? '',
    buttonLabel: banner.button_label ?? '',
    buttonUrl: banner.button_url ?? '',
    sortOrder: String(banner.sort_order),
    active: banner.active,
    startsAt: toDatetimeLocal(banner.starts_at),
    endsAt: toDatetimeLocal(banner.ends_at),
  }
}

export function AdminBannersPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const bannersQuery = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: fetchAllBanners,
    enabled: isAdmin,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingBanner, setEditingBanner] = React.useState<BannerRow | null>(null)
  const [form, setForm] = React.useState<BannerFormState>(emptyForm())
  const [uploadingDesktop, setUploadingDesktop] = React.useState(false)
  const [uploadingMobile, setUploadingMobile] = React.useState(false)
  const [bannerToDelete, setBannerToDelete] = React.useState<BannerRow | null>(null)
  const desktopInputRef = React.useRef<HTMLInputElement>(null)
  const mobileInputRef = React.useRef<HTMLInputElement>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })

  function openCreateDialog() {
    setEditingBanner(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEditDialog(banner: BannerRow) {
    setEditingBanner(banner)
    setForm(toFormState(banner))
    setDialogOpen(true)
  }

  async function handleUpload(file: File, target: 'desktop' | 'mobile') {
    const setUploading = target === 'desktop' ? setUploadingDesktop : setUploadingMobile
    setUploading(true)
    try {
      const url = await uploadImage('banner-images', file)
      setForm((f) =>
        target === 'desktop' ? { ...f, desktopImageUrl: url } : { ...f, mobileImageUrl: url },
      )
      toast.success('Imagem enviada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: BannerInsert = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        desktop_image_url: form.desktopImageUrl,
        mobile_image_url: form.mobileImageUrl.trim() || null,
        button_label: form.buttonLabel.trim() || null,
        button_url: form.buttonUrl.trim() || null,
        sort_order: form.sortOrder.trim() ? Number(form.sortOrder) : 0,
        active: form.active,
        starts_at: fromDatetimeLocal(form.startsAt),
        ends_at: fromDatetimeLocal(form.endsAt),
      }
      if (editingBanner) return updateBanner(editingBanner.id, payload)
      return createBanner(payload)
    },
    onSuccess: () => {
      toast.success(editingBanner ? 'Banner atualizado.' : 'Banner criado.')
      setDialogOpen(false)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar banner.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      toast.success('Banner excluído.')
      setBannerToDelete(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao excluir banner.'),
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.desktopImageUrl) {
      toast.error('Envie a imagem para desktop.')
      return
    }
    saveMutation.mutate()
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem gerenciar banners.
        </p>
        <Link to={paths.admin} className="text-sm text-primary underline">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  const banners = bannersQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Banners</h1>
          <p className="text-sm text-muted-foreground">{banners.length} banner(s) cadastrado(s).</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo banner
        </Button>
      </div>

      {bannersQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum banner cadastrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <img
                src={banner.desktop_image_url}
                alt={banner.title ?? ''}
                className="h-32 w-full object-cover"
              />
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{banner.title || 'Sem título'}</p>
                  <Badge variant={banner.active ? 'default' : 'secondary'}>
                    {banner.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">Ordem: {banner.sort_order}</p>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => openEditDialog(banner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    onClick={() => setBannerToDelete(banner)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Editar banner' : 'Novo banner'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="banner-title">Título</Label>
              <Input
                id="banner-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="banner-subtitle">Subtítulo</Label>
              <Input
                id="banner-subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              />
            </div>
            <div>
              <Label>Imagem para desktop (obrigatória)</Label>
              <div className="flex items-center gap-3">
                {form.desktopImageUrl && (
                  <img
                    src={form.desktopImageUrl}
                    alt=""
                    className="h-14 w-24 rounded object-cover"
                  />
                )}
                <input
                  ref={desktopInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file, 'desktop')
                    if (desktopInputRef.current) desktopInputRef.current.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingDesktop}
                  onClick={() => desktopInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingDesktop ? 'Enviando...' : 'Enviar imagem'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Imagem para mobile (opcional)</Label>
              <div className="flex items-center gap-3">
                {form.mobileImageUrl && (
                  <img
                    src={form.mobileImageUrl}
                    alt=""
                    className="h-14 w-24 rounded object-cover"
                  />
                )}
                <input
                  ref={mobileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file, 'mobile')
                    if (mobileInputRef.current) mobileInputRef.current.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingMobile}
                  onClick={() => mobileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingMobile ? 'Enviando...' : 'Enviar imagem'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="banner-button-label">Texto do botão</Label>
                <Input
                  id="banner-button-label"
                  value={form.buttonLabel}
                  onChange={(e) => setForm((f) => ({ ...f, buttonLabel: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="banner-button-url">Link do botão</Label>
                <Input
                  id="banner-button-url"
                  value={form.buttonUrl}
                  onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="banner-starts">Início (opcional)</Label>
                <Input
                  id="banner-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="banner-ends">Fim (opcional)</Label>
                <Input
                  id="banner-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="banner-sort">Ordem</Label>
                <Input
                  id="banner-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
                />
                <Label>Ativo</Label>
              </div>
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

      <Dialog open={!!bannerToDelete} onOpenChange={(open) => !open && setBannerToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir banner</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>{bannerToDelete?.title || 'este banner'}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => bannerToDelete && deleteMutation.mutate(bannerToDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
