import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { fetchActiveEvents, isUpcomingEvent, type EventRow } from '@/services/events'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Seo } from '@/components/common/Seo'
import { cn } from '@/lib/utils'

function formatEventDate(event: EventRow): string {
  const start = new Date(`${event.event_date}T00:00:00`)
  const startLabel = start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  if (!event.end_date || event.end_date === event.event_date) return startLabel

  const end = new Date(`${event.end_date}T00:00:00`)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const endLabel = end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  if (sameMonth) {
    return `${start.getDate()} a ${endLabel}`
  }
  return `${startLabel} a ${endLabel}`
}

function formatEventTime(time: string | null): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  return `${hours}h${minutes !== '00' ? minutes : ''}`
}

function UpcomingEventCard({ event }: { event: EventRow }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {event.banner_url && (
        <img
          src={event.banner_url}
          alt={event.title}
          className="aspect-[16/7] w-full object-cover"
        />
      )}
      <div className="p-5">
        <Badge className="mb-2">Em breve</Badge>
        <h3 className="font-display text-xl font-semibold">{event.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {formatEventDate(event)}
          </span>
          {event.event_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {formatEventTime(event.event_time)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {event.location}
          </span>
        </div>
        {event.description && (
          <p className="mt-3 text-sm text-foreground/80">{event.description}</p>
        )}
      </div>
    </div>
  )
}

function PastEventCard({ event }: { event: EventRow }) {
  const cover = event.banner_url ?? event.images[0] ?? null
  const gallery = event.images.filter((url) => url !== cover).slice(0, 4)

  return (
    <div className="overflow-hidden rounded-lg border">
      {cover && <img src={cover} alt={event.title} className="aspect-[4/3] w-full object-cover" />}
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold">{event.title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {formatEventDate(event)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {event.location}
          </span>
        </div>
        {event.description && (
          <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{event.description}</p>
        )}
        {gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {gallery.map((url, i) => (
              <img key={url + i} src={url} alt="" className="aspect-square rounded object-cover" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventSkeletonGrid({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full" />
      ))}
    </div>
  )
}

export function EventsPage() {
  const eventsQuery = useQuery({ queryKey: ['events', 'active'], queryFn: fetchActiveEvents })

  const events = eventsQuery.data ?? []
  const upcoming = events.filter((e) => isUpcomingEvent(e))
  const past = events
    .filter((e) => !isUpcomingEvent(e))
    .sort((a, b) => b.event_date.localeCompare(a.event_date))

  return (
    <div className="container py-8">
      <Seo
        title="Eventos"
        description="Confira os próximos eventos da Casa Belém Acessórios e relembre feiras e convenções que já participamos."
      />
      <h1 className="font-display text-3xl font-semibold">Eventos</h1>
      <p className="mt-1 text-muted-foreground">
        Feiras, convenções e encontros com a Casa Belém Acessórios.
      </p>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-2xl font-semibold">Próximos eventos</h2>
        {eventsQuery.isLoading ? (
          <EventSkeletonGrid />
        ) : upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            Nenhum evento programado no momento.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((event) => (
              <UpcomingEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold">Eventos que já participamos</h2>
        {eventsQuery.isLoading ? (
          <EventSkeletonGrid className="sm:grid-cols-3" />
        ) : past.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            Em breve compartilhamos fotos dos nossos eventos por aqui.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <PastEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
