-- =============================================================================
-- orders
-- =============================================================================
create sequence public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language sql
as $$
  select 'CB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  user_id uuid references public.profiles (id) on delete set null,
  guest_name text,
  guest_email text,
  guest_cpf text,
  guest_phone text,
  status text not null default 'awaiting_payment' check (
    status in (
      'awaiting_payment', 'payment_approved', 'preparing', 'shipped',
      'delivered', 'cancelled', 'refunded'
    )
  ),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_id uuid references public.coupons (id),
  shipping_address jsonb not null,
  shipping_method text not null default 'standard' check (
    shipping_method in ('pickup', 'local_delivery', 'standard', 'free')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_customer_identified check (
    user_id is not null or (guest_name is not null and guest_email is not null)
  )
);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index idx_orders_user on public.orders (user_id, created_at desc);
create index idx_orders_status on public.orders (status);
create index idx_orders_number on public.orders (order_number);

-- =============================================================================
-- order_items
-- =============================================================================
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0)
);

create index idx_order_items_order on public.order_items (order_id);

-- =============================================================================
-- order_status_history
-- =============================================================================
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index idx_order_status_history_order on public.order_status_history (order_id, created_at desc);

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_orders_log_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status_change();

create trigger trg_orders_log_status_update
  after update on public.orders
  for each row execute function public.log_order_status_change();

-- =============================================================================
-- RLS
-- Nenhuma policy de INSERT é concedida a authenticated/anon: pedidos só podem
-- ser criados pela função public.create_order (SECURITY DEFINER), que
-- recalcula e valida tudo no backend (ver migration de order_functions).
-- =============================================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "orders_select_own_or_staff"
  on public.orders for select
  using (user_id = auth.uid() or public.is_admin_or_operator());

create policy "orders_update_staff_only"
  on public.orders for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "order_items_select_own_or_staff"
  on public.order_items for select
  using (
    public.is_admin_or_operator()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_status_history_select_own_or_staff"
  on public.order_status_history for select
  using (
    public.is_admin_or_operator()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
