import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, Clock, EyeOff, MapPin, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  createEvent,
  deleteEvent,
  fetchAllEvents,
  updateEvent,
  type EventInsert,
  type EventRow,
} from '@/services/admin/adminEvents'
import { isUpcomingEvent } from '@/services/events'
import { uploadImage } from '@/services/admin/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface EventFormState {
  title: string
  description: string
  bannerUrl: string
  images: string[]
  eventDate: string
  endDate: string
  eventTime: string
  publishAt: string
  location: string
  active: boolean
}

function emptyForm(): EventFormState {
  return {
    title: '',
    description: '',
    bannerUrl: '',
    images: [],
    eventDate: '',
    endDate: '',
    eventTime: '',
    publishAt: '',
    location: '',
    active: true,
  }
}

function toFormState(event: EventRow): EventFormState {
  return {
    title: event.title,
    description: event.description ?? '',
    bannerUrl: event.banner_url ?? '',
    images: event.images,
    eventDate: event.event_date,
    endDate: event.end_date ?? '',
    eventTime: event.event_time ?? '',
    publishAt: event.publish_at ?? '',
    location: event.location,
    active: event.active,
  }
}

// "Aguardando publicação" quando o admin já cadastrou o evento mas escolheu
// uma data futura para ele começar a aparecer no site (publish_at).
function isPendingPublication(event: EventRow): boolean {
  if (!event.publish_at) return false
  const todayStr = new Date().toISOString().slice(0, 10)
  return event.publish_at > todayStr
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

interface EventCardProps {
  event: EventRow
  onEdit: (event: EventRow) => void
  onDelete: (event: EventRow) => void
}

function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const pending = isPendingPublication(event)
  return (
    <Card className="overflow-hidden">
      {(event.banner_url ?? event.images[0]) && (
        <img
          src={event.banner_url ?? event.images[0]}
          alt={event.title}
          className="h-32 w-full object-cover"
        />
      )}
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{event.title}</p>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {!event.active && <Badge variant="outline">Oculto</Badge>}
            {pending && (
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" /> Aguardando {formatDate(event.publish_at!)}
              </Badge>
            )}
          </div>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(event.event_date)}
          {event.event_time && (
            <>
              <Clock className="ml-1 h-3.5 w-3.5" /> {event.event_time.slice(0, 5)}
            </>
          )}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {event.location}
        </p>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Editar" onClick={() => onEdit(event)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Excluir" onClick={() => onDelete(event)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminEventsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const eventsQuery = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: fetchAllEvents,
    enabled: isAdmin,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState<EventRow | null>(null)
  const [form, setForm] = React.useState<EventFormState>(emptyForm())
  const [uploadingBanner, setUploadingBanner] = React.useState(false)
  const [uploadingGallery, setUploadingGallery] = React.useState(false)
  const [eventToDelete, setEventToDelete] = React.useState<EventRow | null>(null)
  const bannerInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })

  function openCreateDialog() {
    setEditingEvent(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEditDialog(event: EventRow) {
    setEditingEvent(event)
    setForm(toFormState(event))
    setDialogOpen(true)
  }

  async function handleBannerUpload(file: File) {
    setUploadingBanner(true)
    try {
      const url = await uploadImage('event-images', file)
      setForm((f) => ({ ...f, bannerUrl: url }))
      toast.success('Banner enviado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagem.')
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleGalleryUpload(files: FileList) {
    setUploadingGallery(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadImage('event-images', file)),
      )
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }))
      toast.success(`${uploaded.length} foto(s) enviada(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar fotos.')
    } finally {
      setUploadingGallery(false)
    }
  }

  function removeGalleryImage(url: string) {
    setForm((f) => ({ ...f, images: f.images.filter((img) => img !== url) }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: EventInsert = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        banner_url: form.bannerUrl.trim() || null,
        images: form.images,
        event_date: form.eventDate,
        end_date: form.endDate.trim() || null,
        event_time: form.eventTime.trim() || null,
        publish_at: form.publishAt.trim() || null,
        location: form.location.trim(),
        active: form.active,
      }
      if (editingEvent) return updateEvent(editingEvent.id, payload)
      return createEvent(payload)
    },
    onSuccess: () => {
      toast.success(editingEvent ? 'Evento atualizado.' : 'Evento criado.')
      setDialogOpen(false)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao salvar evento.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      toast.success('Evento excluído.')
      setEventToDelete(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao excluir evento.'),
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) return toast.error('Informe o título do evento.')
    if (!form.eventDate) return toast.error('Informe a data do evento.')
    if (!form.location.trim()) return toast.error('Informe o local do evento.')
    if (form.publishAt && form.publishAt > form.eventDate) {
      return toast.error('A data de publicação não pode ser depois da data do evento.')
    }
    saveMutation.mutate()
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem gerenciar eventos.
        </p>
        <Link to={paths.admin} className="text-sm text-primary underline">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  const events = eventsQuery.data ?? []
  const upcoming = events.filter((e) => isUpcomingEvent(e))
  const past = events.filter((e) => !isUpcomingEvent(e))

  // Prévia ao vivo no formulário: mesma regra de src/services/events.ts
  // (data final, se houver, senão a data do evento, comparada com hoje).
  const willBeUpcoming = (form.endDate || form.eventDate) >= new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Eventos</h1>
          <p className="text-sm text-muted-foreground">{events.length} evento(s) cadastrado(s).</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo evento
        </Button>
      </div>

      {eventsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum evento cadastrado.</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Próximos eventos
              <Badge variant="default">{upcoming.length}</Badge>
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento futuro cadastrado.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={openEditDialog}
                    onDelete={setEventToDelete}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Eventos realizados
              <Badge variant="secondary">{past.length}</Badge>
            </h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento realizado ainda.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={openEditDialog}
                    onDelete={setEventToDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event-description">Descrição</Label>
              <Textarea
                id="event-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">Data {form.endDate ? 'inicial' : ''}</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="event-end-date">Data final (opcional)</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            {form.eventDate && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Vai aparecer em:{' '}
                <Badge variant={willBeUpcoming ? 'default' : 'secondary'} className="align-middle">
                  {willBeUpcoming ? 'Próximos eventos' : 'Eventos realizados'}
                </Badge>
              </p>
            )}
            <div>
              <Label htmlFor="event-time">Horário (opcional)</Label>
              <Input
                id="event-time"
                type="time"
                className="max-w-[160px]"
                value={form.eventTime}
                onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Exibido para os próximos eventos.
              </p>
            </div>
            <div>
              <Label htmlFor="event-location">Local</Label>
              <Input
                id="event-location"
                placeholder="Ex: Hangar Convenções, Belém - PA"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="event-publish-at">Publicar no site a partir de (opcional)</Label>
              <Input
                id="event-publish-at"
                type="date"
                value={form.publishAt}
                onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Deixe em branco para aparecer assim que salvar. Ex.: evento no dia 15/09 — preencha
                13/09 aqui para ele só aparecer no site 2 dias antes.
              </p>
            </div>

            <div>
              <Label>Banner do evento</Label>
              <div className="flex items-center gap-3">
                {form.bannerUrl && (
                  <img src={form.bannerUrl} alt="" className="h-14 w-24 rounded object-cover" />
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleBannerUpload(file)
                    if (bannerInputRef.current) bannerInputRef.current.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingBanner ? 'Enviando...' : 'Enviar banner'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Usado em destaque nos eventos próximos e como capa nos eventos realizados.
              </p>
            </div>

            <div>
              <Label>Fotos do evento</Label>
              {form.images.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {form.images.map((url) => (
                    <div key={url} className="group relative">
                      <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remover foto"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) handleGalleryUpload(files)
                  if (galleryInputRef.current) galleryInputRef.current.value = ''
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingGallery}
                onClick={() => galleryInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploadingGallery ? 'Enviando...' : 'Adicionar fotos'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
              <Label>Visível no site</Label>
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

      <Dialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{eventToDelete?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => eventToDelete && deleteMutation.mutate(eventToDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
