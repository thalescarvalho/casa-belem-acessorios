create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  used_at timestamptz not null default now()
);

create index idx_coupon_usages_coupon on public.coupon_usages (coupon_id);
create index idx_coupon_usages_user on public.coupon_usages (user_id);
create unique index uq_coupon_usages_order on public.coupon_usages (order_id);

alter table public.coupon_usages enable row level security;

create policy "coupon_usages_select_own_or_staff"
  on public.coupon_usages for select
  using (public.is_admin_or_operator() or user_id = auth.uid());

-- =============================================================================
-- validate_coupon: única forma suportada de validar/calcular desconto de
-- cupom. Recebe os itens do carrinho (produto, categoria, preço unitário,
-- quantidade) para poder respeitar restrições de produto/categoria do cupom.
-- SECURITY DEFINER porque a tabela coupons não tem policy pública de select.
-- =============================================================================
create type public.coupon_validation_result as (
  valid boolean,
  message text,
  coupon_id uuid,
  discount_cents integer,
  free_shipping boolean
);

create or replace function public.validate_coupon(
  p_code text,
  p_items jsonb, -- [{ "product_id": uuid, "category_id": uuid, "unit_price_cents": int, "quantity": int }]
  p_user_id uuid default null
)
returns public.coupon_validation_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_subtotal_cents integer := 0;
  v_eligible_cents integer := 0;
  v_discount_cents integer := 0;
  v_usage_count integer;
  v_customer_usage_count integer;
  v_item record;
  v_restricted boolean;
begin
  select * into v_coupon from public.coupons where upper(code) = upper(p_code) and active limit 1;

  if not found then
    return row(false, 'Cupom inválido.', null, 0, false)::public.coupon_validation_result;
  end if;

  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    return row(false, 'Cupom ainda não está válido.', null, 0, false)::public.coupon_validation_result;
  end if;

  if v_coupon.expires_at is not null and now() > v_coupon.expires_at then
    return row(false, 'Cupom expirado.', null, 0, false)::public.coupon_validation_result;
  end if;

  if v_coupon.usage_limit is not null then
    select count(*) into v_usage_count from public.coupon_usages where coupon_id = v_coupon.id;
    if v_usage_count >= v_coupon.usage_limit then
      return row(false, 'Cupom atingiu o limite de uso.', null, 0, false)::public.coupon_validation_result;
    end if;
  end if;

  if p_user_id is not null then
    select count(*) into v_customer_usage_count
      from public.coupon_usages where coupon_id = v_coupon.id and user_id = p_user_id;
    if v_customer_usage_count >= v_coupon.usage_limit_per_customer then
      return row(false, 'Você já utilizou este cupom.', null, 0, false)::public.coupon_validation_result;
    end if;
  end if;

  v_restricted := array_length(v_coupon.applicable_product_ids, 1) is not null
    or array_length(v_coupon.applicable_category_ids, 1) is not null;

  for v_item in select * from jsonb_to_recordset(p_items)
    as x(product_id uuid, category_id uuid, unit_price_cents integer, quantity integer)
  loop
    v_subtotal_cents := v_subtotal_cents + (v_item.unit_price_cents * v_item.quantity);

    if not v_restricted
      or v_item.product_id = any (v_coupon.applicable_product_ids)
      or v_item.category_id = any (v_coupon.applicable_category_ids)
    then
      v_eligible_cents := v_eligible_cents + (v_item.unit_price_cents * v_item.quantity);
    end if;
  end loop;

  if v_subtotal_cents < v_coupon.min_order_cents then
    return row(
      false,
      format('Pedido mínimo de %s para usar este cupom.', to_char(v_coupon.min_order_cents / 100.0, 'FM999999990.00')),
      null, 0, false
    )::public.coupon_validation_result;
  end if;

  if v_eligible_cents <= 0 and v_coupon.type <> 'free_shipping' then
    return row(false, 'Cupom não é aplicável aos produtos do carrinho.', null, 0, false)::public.coupon_validation_result;
  end if;

  if v_coupon.type = 'percentage' then
    v_discount_cents := round(v_eligible_cents * (v_coupon.value / 100.0));
  elsif v_coupon.type = 'fixed' then
    v_discount_cents := least(round(v_coupon.value * 100), v_eligible_cents);
  else
    v_discount_cents := 0; -- free_shipping: desconto de frete é aplicado no cálculo do pedido
  end if;

  return row(
    true, 'Cupom aplicado com sucesso.', v_coupon.id, v_discount_cents, v_coupon.type = 'free_shipping'
  )::public.coupon_validation_result;
end;
$$;

grant execute on function public.validate_coupon(text, jsonb, uuid) to anon, authenticated;
