-- =============================================================================
-- events: feiras, convenções e outros eventos presenciais da loja.
-- "Próximo" ou "realizado" é derivado da data (event_date/end_date) em vez de
-- um campo manual — evita o admin esquecer de mudar o status depois do
-- evento acontecer.
-- =============================================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  banner_url text,
  images text[] not null default '{}',
  event_date date not null,
  end_date date,
  location text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_date_after_start check (end_date is null or end_date >= event_date)
);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create index idx_events_active_date on public.events (active, event_date desc);

alter table public.events enable row level security;

create policy "events_public_read_active"
  on public.events for select
  using (active or public.is_admin());

create policy "events_write_admin_only"
  on public.events for insert
  with check (public.is_admin());

create policy "events_update_admin_only"
  on public.events for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_delete_admin_only"
  on public.events for delete
  using (public.is_admin());

-- =============================================================================
-- Storage: fotos de eventos (banner + galeria). Leitura pública, escrita
-- restrita a admin — mesmo padrão de banner-images.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "storage_public_read_event_images"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "storage_admin_write_event_images"
  on storage.objects for insert
  with check (bucket_id = 'event-images' and public.is_admin());

create policy "storage_admin_update_event_images"
  on storage.objects for update
  using (bucket_id = 'event-images' and public.is_admin())
  with check (bucket_id = 'event-images' and public.is_admin());

create policy "storage_admin_delete_event_images"
  on storage.objects for delete
  using (bucket_id = 'event-images' and public.is_admin());
