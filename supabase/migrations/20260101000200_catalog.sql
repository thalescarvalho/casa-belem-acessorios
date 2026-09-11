-- =============================================================================
-- categories
-- =============================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index idx_categories_active_sort on public.categories (active, sort_order);

-- =============================================================================
-- products
-- =============================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  internal_code text,
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  price_cents integer not null check (price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or sale_price_cents >= 0),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  length_cm numeric(6, 2),
  width_cm numeric(6, 2),
  height_cm numeric(6, 2),
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  allow_backorder boolean not null default false,
  min_stock_alert integer not null default 3,
  meta_title text,
  meta_description text,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_price_lower_than_price check (
    sale_price_cents is null or sale_price_cents <= price_cents
  )
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index idx_products_status on public.products (status);
create index idx_products_category on public.products (category_id);
create index idx_products_featured on public.products (is_featured) where is_featured;
create index idx_products_new on public.products (is_new) where is_new;
create index idx_products_bestseller on public.products (is_bestseller) where is_bestseller;
create index idx_products_name_trgm on public.products using gin (name public.gin_trgm_ops);
create index idx_products_tags on public.products using gin (tags);

-- =============================================================================
-- product_images
-- =============================================================================
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_product_images_product on public.product_images (product_id, sort_order);
create unique index uq_product_images_single_primary
  on public.product_images (product_id) where is_primary;

-- =============================================================================
-- product_variants (ex.: cor/tamanho). price_delta_cents é somado ao preço
-- base do produto (ou ao preço promocional, quando houver) para obter o
-- preço final da variação.
-- =============================================================================
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text unique,
  price_delta_cents integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_product_variants_product on public.product_variants (product_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

create policy "categories_public_read_active"
  on public.categories for select
  using (active or public.is_admin_or_operator());

create policy "categories_write_admin_or_operator"
  on public.categories for insert
  with check (public.is_admin_or_operator());

create policy "categories_update_admin_or_operator"
  on public.categories for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "categories_delete_admin_or_operator"
  on public.categories for delete
  using (public.is_admin_or_operator());

create policy "products_public_read_active"
  on public.products for select
  using (status = 'active' or public.is_admin_or_operator());

create policy "products_write_admin_or_operator"
  on public.products for insert
  with check (public.is_admin_or_operator());

create policy "products_update_admin_or_operator"
  on public.products for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "products_delete_admin_or_operator"
  on public.products for delete
  using (public.is_admin_or_operator());

create policy "product_images_public_read"
  on public.product_images for select
  using (
    public.is_admin_or_operator()
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

create policy "product_images_write_admin_or_operator"
  on public.product_images for insert
  with check (public.is_admin_or_operator());

create policy "product_images_update_admin_or_operator"
  on public.product_images for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "product_images_delete_admin_or_operator"
  on public.product_images for delete
  using (public.is_admin_or_operator());

create policy "product_variants_public_read"
  on public.product_variants for select
  using (
    public.is_admin_or_operator()
    or (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'))
  );

create policy "product_variants_write_admin_or_operator"
  on public.product_variants for insert
  with check (public.is_admin_or_operator());

create policy "product_variants_update_admin_or_operator"
  on public.product_variants for update
  using (public.is_admin_or_operator())
  with check (public.is_admin_or_operator());

create policy "product_variants_delete_admin_or_operator"
  on public.product_variants for delete
  using (public.is_admin_or_operator());
