create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text,
  method text not null check (method in ('pix', 'credit_card')),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')
  ),
  amount_cents integer not null check (amount_cents >= 0),
  installments integer not null default 1 check (installments >= 1),
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index idx_payments_order on public.payments (order_id);
create unique index uq_payments_provider_id on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

-- =============================================================================
-- RLS
-- Nenhuma escrita client-side: pagamentos são criados/atualizados somente
-- pelas Edge Functions (create-payment, mercadopago-webhook) usando a
-- service_role key, que ignora RLS. O cliente só pode LER o próprio pagamento.
-- =============================================================================
alter table public.payments enable row level security;

create policy "payments_select_own_or_staff"
  on public.payments for select
  using (
    public.is_admin_or_operator()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
