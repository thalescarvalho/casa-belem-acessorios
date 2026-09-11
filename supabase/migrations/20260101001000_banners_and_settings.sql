create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  desktop_image_url text not null,
  mobile_image_url text,
  button_label text,
  button_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_banners_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

create index idx_banners_active_sort on public.banners (active, sort_order);

alter table public.banners enable row level security;

create policy "banners_public_read_active_in_window"
  on public.banners for select
  using (
    public.is_admin_or_operator()
    or (
      active
      and (starts_at is null or now() >= starts_at)
      and (ends_at is null or now() <= ends_at)
    )
  );

create policy "banners_write_admin_only"
  on public.banners for insert
  with check (public.is_admin());

create policy "banners_update_admin_only"
  on public.banners for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "banners_delete_admin_only"
  on public.banners for delete
  using (public.is_admin());

-- =============================================================================
-- site_settings: chave/valor. Toda informação comercial (whatsapp, endereço,
-- redes sociais, cores, textos, políticas, regras de frete, meios de
-- pagamento habilitados) fica aqui — nunca hardcoded no código-fonte.
-- Leitura pública (o site precisa renderizar isso sem login); escrita
-- restrita a admin.
-- =============================================================================
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

create policy "site_settings_write_admin_only"
  on public.site_settings for insert
  with check (public.is_admin());

create policy "site_settings_update_admin_only"
  on public.site_settings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "site_settings_delete_admin_only"
  on public.site_settings for delete
  using (public.is_admin());
