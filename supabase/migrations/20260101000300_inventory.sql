-- =============================================================================
-- inventory: uma linha por produto (sem variação) ou por variação.
-- =============================================================================
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- Garante no máximo uma linha de estoque por produto sem variação, e uma por
-- combinação produto+variação (NULL não é comparável em índice único comum).
create unique index uq_inventory_product_no_variant
  on public.inventory (product_id) where variant_id is null;
create unique index uq_inventory_product_variant
  on public.inventory (product_id, variant_id) where variant_id is not null;

create index idx_inventory_product on public.inventory (product_id);

-- =============================================================================
-- inventory_movements: histórico completo de entradas/saídas/ajustes
-- =============================================================================
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjustment', 'sale', 'cancellation', 'reservation', 'release')),
  quantity_delta integer not null,
  reason text,
  order_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index idx_inventory_movements_inventory on public.inventory_movements (inventory_id, created_at desc);
create index idx_inventory_movements_order on public.inventory_movements (order_id);

-- =============================================================================
-- RLS
-- Estoque (quantidade) é público para leitura — necessário para exibir
-- disponibilidade na vitrine — mas só admin/operador podem escrever direto.
-- Toda escrita "de negócio" (venda, reserva) deve passar pela função
-- public.create_order(...) (SECURITY DEFINER), nunca pelo cliente direto.
-- =============================================================================
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;

create policy "inventory_public_read"
  on public.inventory for select
  using (true);

create policy "inventory_write_admin_or_operator"
  on public.inventory for insert
  with check (public.is_admin_or_operator());

create policy "inventory_update_admin_or_operator"
  on public.inventory for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "inventory_delete_admin_only"
  on public.inventory for delete
  using (public.is_admin());

create policy "inventory_movements_read_admin_or_operator"
  on public.inventory_movements for select
  using (public.is_admin_or_operator());

create policy "inventory_movements_insert_admin_or_operator"
  on public.inventory_movements for insert
  with check (public.is_admin_or_operator());
