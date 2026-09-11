-- =============================================================================
-- shipping_quotes: cotações reais de frete (Melhor Envio), geradas pela Edge
-- Function calculate-shipping-quote a partir do peso/dimensões reais dos
-- produtos (nunca do que o frontend informar) e validadas por
-- public.create_order antes de virarem o shipping_cents do pedido.
--
-- Sem policies de select/insert/update/delete: a escrita só acontece via
-- service_role (dentro da Edge Function) e a leitura de validação acontece
-- dentro de public.create_order (SECURITY DEFINER, dono postgres) — nunca
-- diretamente pela API do PostgREST, seguindo o mesmo princípio das demais
-- tabelas do projeto (seção 12 do README).
-- =============================================================================
create table public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  cep_destino text not null check (cep_destino ~ '^[0-9]{8}$'),
  carrier_name text not null,
  service_name text not null,
  cost_cents integer not null check (cost_cents >= 0),
  deadline_days integer,
  weight_grams integer not null check (weight_grams >= 0),
  raw_response jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_shipping_quotes_expires on public.shipping_quotes (expires_at);

alter table public.shipping_quotes enable row level security;

-- =============================================================================
-- orders: referência à cotação usada (quando o método "standard" foi
-- calculado via transportadora real) + preenchimento automático do campo
-- "carrier" já existente (ver 20260101001400_order_tracking.sql), poupando o
-- admin de digitar a transportadora manualmente nesse caso.
-- =============================================================================
alter table public.orders
  add column shipping_quote_id uuid references public.shipping_quotes (id);

-- =============================================================================
-- create_order: adiciona o parâmetro opcional p_shipping_quote_id. Quando
-- informado, o frete do pedido vem da cotação real gravada por
-- calculate-shipping-quote (validada aqui: precisa existir, não estar
-- expirada e ser para o mesmo CEP do endereço de entrega) — nunca de um
-- valor calculado no frontend. Sem quote_id, mantém o comportamento anterior
-- (public.calculate_shipping — usado por pickup/local_delivery/free e como
-- fallback de "standard" quando a integração de frete não está configurada).
-- =============================================================================
drop function if exists public.create_order(
  jsonb, jsonb, text, text, text, text, text, text, text
);

create or replace function public.create_order(
  p_items jsonb, -- [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
  p_shipping_address jsonb,
  p_shipping_method text,
  p_coupon_code text default null,
  p_guest_name text default null,
  p_guest_email text default null,
  p_guest_cpf text default null,
  p_guest_phone text default null,
  p_notes text default null,
  p_shipping_quote_id uuid default null
)
returns table (order_id uuid, order_number text, total_cents integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item record;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_inventory public.inventory%rowtype;
  v_unit_price_cents integer;
  v_decrement integer;
  v_subtotal_cents integer := 0;
  v_discount_cents integer := 0;
  v_shipping_cents integer := 0;
  v_total_cents integer;
  v_order_id uuid;
  v_order_number text;
  v_coupon_result public.coupon_validation_result;
  v_items_for_coupon jsonb := '[]'::jsonb;
  v_quote public.shipping_quotes%rowtype;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;

  if v_user_id is null and (p_guest_name is null or p_guest_email is null) then
    raise exception 'Identificação obrigatória para finalizar como visitante.';
  end if;

  if p_shipping_address is null or not (p_shipping_address ? 'cep') then
    raise exception 'Endereço de entrega inválido.';
  end if;

  create temporary table tmp_order_items (
    product_id uuid,
    variant_id uuid,
    product_name text,
    sku text,
    category_id uuid,
    quantity integer,
    unit_price_cents integer,
    total_cents integer,
    inventory_id uuid,
    decrement integer
  ) on commit drop;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, quantity integer)
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Item de carrinho inválido.';
    end if;

    select * into v_product from public.products
      where id = v_item.product_id and status = 'active' for update;
    if not found then
      raise exception 'Produto indisponível.';
    end if;

    v_unit_price_cents := coalesce(v_product.sale_price_cents, v_product.price_cents);
    v_variant := null;

    if v_item.variant_id is not null then
      select * into v_variant from public.product_variants
        where id = v_item.variant_id and product_id = v_product.id and active for update;
      if not found then
        raise exception 'Variação indisponível para "%".', v_product.name;
      end if;
      v_unit_price_cents := v_unit_price_cents + v_variant.price_delta_cents;
    end if;

    select * into v_inventory from public.inventory
      where product_id = v_item.product_id and variant_id is not distinct from v_item.variant_id
      for update;
    if not found then
      raise exception 'Estoque não configurado para "%".', v_product.name;
    end if;

    if (v_inventory.quantity - v_inventory.reserved_quantity) < v_item.quantity
       and not v_product.allow_backorder then
      raise exception 'Estoque insuficiente para "%". Disponível: %.', v_product.name,
        greatest(v_inventory.quantity - v_inventory.reserved_quantity, 0);
    end if;

    v_decrement := least(v_item.quantity, v_inventory.quantity);

    insert into tmp_order_items (
      product_id, variant_id, product_name, sku, category_id,
      quantity, unit_price_cents, total_cents, inventory_id, decrement
    ) values (
      v_product.id, v_item.variant_id, v_product.name, coalesce(v_variant.sku, v_product.sku),
      v_product.category_id, v_item.quantity, v_unit_price_cents,
      v_unit_price_cents * v_item.quantity, v_inventory.id, v_decrement
    );

    v_subtotal_cents := v_subtotal_cents + (v_unit_price_cents * v_item.quantity);
    v_items_for_coupon := v_items_for_coupon || jsonb_build_object(
      'product_id', v_product.id,
      'category_id', v_product.category_id,
      'unit_price_cents', v_unit_price_cents,
      'quantity', v_item.quantity
    );
  end loop;

  if p_shipping_quote_id is not null then
    select * into v_quote from public.shipping_quotes where id = p_shipping_quote_id for update;
    if not found then
      raise exception 'Cotação de frete não encontrada. Recalcule o frete.';
    end if;
    if v_quote.expires_at < now() then
      raise exception 'Cotação de frete expirada. Recalcule o frete.';
    end if;
    if v_quote.cep_destino <> regexp_replace(p_shipping_address ->> 'cep', '\D', '', 'g') then
      raise exception 'Cotação de frete não corresponde ao endereço de entrega. Recalcule o frete.';
    end if;
    v_shipping_cents := v_quote.cost_cents;
  else
    v_shipping_cents := public.calculate_shipping(p_shipping_method, v_subtotal_cents);
  end if;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_coupon_result := public.validate_coupon(p_coupon_code, v_items_for_coupon, v_user_id);
    if not v_coupon_result.valid then
      raise exception '%', v_coupon_result.message;
    end if;
    v_discount_cents := v_coupon_result.discount_cents;
    if v_coupon_result.free_shipping then
      v_shipping_cents := 0;
    end if;
  end if;

  v_total_cents := greatest(v_subtotal_cents - v_discount_cents, 0) + v_shipping_cents;

  insert into public.orders (
    user_id, guest_name, guest_email, guest_cpf, guest_phone,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    coupon_id, shipping_address, shipping_method, notes,
    shipping_quote_id, carrier
  ) values (
    v_user_id, p_guest_name, p_guest_email, p_guest_cpf, p_guest_phone,
    v_subtotal_cents, v_discount_cents, v_shipping_cents, v_total_cents,
    v_coupon_result.coupon_id, p_shipping_address, p_shipping_method, p_notes,
    v_quote.id, v_quote.carrier_name
  ) returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, sku, quantity, unit_price_cents, total_cents
  )
  select v_order_id, product_id, variant_id, product_name, sku, quantity, unit_price_cents, total_cents
  from tmp_order_items;

  update public.inventory inv
    set quantity = inv.quantity - t.decrement
    from tmp_order_items t
    where inv.id = t.inventory_id;

  insert into public.inventory_movements (inventory_id, type, quantity_delta, reason, order_id, created_by)
  select inventory_id, 'sale', -decrement, 'Venda - pedido ' || v_order_number, v_order_id, v_user_id
  from tmp_order_items
  where decrement > 0;

  if v_coupon_result.coupon_id is not null then
    insert into public.coupon_usages (coupon_id, order_id, user_id)
    values (v_coupon_result.coupon_id, v_order_id, v_user_id);
  end if;

  perform public.write_audit_log(
    'order_created', 'order', v_order_id, null,
    jsonb_build_object('order_number', v_order_number, 'total_cents', v_total_cents)
  );

  return query select v_order_id, v_order_number, v_total_cents;
end;
$$;

grant execute on function public.create_order(
  jsonb, jsonb, text, text, text, text, text, text, text, uuid
) to anon, authenticated;
