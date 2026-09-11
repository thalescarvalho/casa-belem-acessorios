create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_favorites_user on public.favorites (user_id);

alter table public.favorites enable row level security;

create policy "favorites_owner_all"
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  comment text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create index idx_reviews_product on public.reviews (product_id, status);

alter table public.reviews enable row level security;

create policy "reviews_public_read_approved"
  on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin_or_operator());

create policy "reviews_owner_insert"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "reviews_owner_update_own_or_staff_moderate"
  on public.reviews for update
  using (user_id = auth.uid() or public.is_admin_or_operator())
  with check (user_id = auth.uid() or public.is_admin_or_operator());

create policy "reviews_owner_delete_own_or_staff"
  on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin_or_operator());
