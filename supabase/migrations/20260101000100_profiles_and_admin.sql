-- =============================================================================
-- profiles: dados públicos/pessoais do cliente, 1:1 com auth.users
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  cpf text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile quando um usuário se cadastra via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- admin_users: lista de acesso de administração (RBAC). Fonte única de verdade
-- para quem pode acessar /admin e com qual papel — NUNCA usar profiles.role
-- para decidir permissões críticas.
-- =============================================================================
create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'operator')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

-- Funções auxiliares de RBAC (SECURITY DEFINER para poder ler admin_users
-- independente das políticas RLS de quem está chamando, evitando recursão).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_admin_or_operator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create or replace function public.current_admin_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.admin_users where user_id = auth.uid();
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin_or_operator());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_update_any"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Nenhuma policy de insert/delete pública: profiles é criado via trigger
-- (security definer) e removido em cascata quando o auth.users é removido.

create policy "admin_users_select_admin_only"
  on public.admin_users for select
  using (public.is_admin());

create policy "admin_users_write_admin_only"
  on public.admin_users for insert
  with check (public.is_admin());

create policy "admin_users_update_admin_only"
  on public.admin_users for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_users_delete_admin_only"
  on public.admin_users for delete
  using (public.is_admin());
