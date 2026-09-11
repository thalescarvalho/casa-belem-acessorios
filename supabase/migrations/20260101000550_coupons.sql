-- Criado antes de "orders" porque orders.coupon_id referencia esta tabela.
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed', 'free_shipping')),
  value numeric(10, 2) not null default 0 check (value >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  usage_limit integer,
  usage_limit_per_customer integer not null default 1,
  applicable_category_ids uuid[] not null default '{}',
  applicable_product_ids uuid[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint percentage_max_100 check (type <> 'percentage' or value <= 100)
);

create trigger trg_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

create unique index uq_coupons_code_upper on public.coupons (upper(code));

-- Sem policy pública de leitura: cupons são validados exclusivamente via
-- public.validate_coupon(...) (SECURITY DEFINER), nunca lidos diretamente
-- pelo cliente — impede enumerar/descobrir códigos e evita confiar no
-- frontend para checar validade/desconto (regra da seção 11 do briefing).
alter table public.coupons enable row level security;

create policy "coupons_admin_only_select"
  on public.coupons for select
  using (public.is_admin());

create policy "coupons_admin_only_write"
  on public.coupons for insert
  with check (public.is_admin());

create policy "coupons_admin_only_update"
  on public.coupons for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "coupons_admin_only_delete"
  on public.coupons for delete
  using (public.is_admin());
