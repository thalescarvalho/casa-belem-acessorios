-- =============================================================================
-- calculate_shipping: lê as regras de frete configuráveis em site_settings
-- (chave "freight_rules"), nunca confia em valor de frete vindo do cliente.
-- Formato esperado de site_settings.value para a chave "freight_rules":
-- {
--   "pickup":         { "enabled": true,  "cost_cents": 0 },
--   "local_delivery": { "enabled": true,  "cost_cents": 1500 },
--   "standard":       { "enabled": true,  "cost_cents": 2500, "free_above_cents": 30000 },
--   "free":           { "enabled": false, "cost_cents": 0 }
-- }
-- =============================================================================
create or replace function public.calculate_shipping(p_method text, p_subtotal_cents integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rules jsonb;
  v_rule jsonb;
  v_free_above integer;
  v_cost integer;
begin
  select value into v_rules from public.site_settings where key = 'freight_rules';

  if v_rules is null then
    return case p_method when 'pickup' then 0 else 1500 end;
  end if;

  v_rule := v_rules -> p_method;
  if v_rule is null or coalesce((v_rule ->> 'enabled')::boolean, false) = false then
    raise exception 'Método de entrega indisponível.';
  end if;

  v_cost := coalesce((v_rule ->> 'cost_cents')::integer, 0);
  v_free_above := nullif(v_rule ->> 'free_above_cents', '')::integer;

  if v_free_above is not null and p_subtotal_cents >= v_free_above then
    return 0;
  end if;

  return v_cost;
end;
$$;

grant execute on function public.calculate_shipping(text, integer) to anon, authenticated;

-- =============================================================================
-- create_order: única forma suportada de criar um pedido. Recalcula preços,
-- valida estoque (com lock de linha) e cupom inteiramente no backend — o
-- cliente nunca determina valor, desconto, estoque ou frete (seção 11).
-- =============================================================================
create or replace function public.create_order(
  p_items jsonb, -- [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
  p_shipping_address jsonb,
  p_shipping_method text,
  p_coupon_code text default null,
  p_guest_name text default null,
  p_guest_email text default null,
  p_guest_cpf text default null,
  p_guest_phone text default null,
  p_notes text default null
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

  v_shipping_cents := public.calculate_shipping(p_shipping_method, v_subtotal_cents);

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
    coupon_id, shipping_address, shipping_method, notes
  ) values (
    v_user_id, p_guest_name, p_guest_email, p_guest_cpf, p_guest_phone,
    v_subtotal_cents, v_discount_cents, v_shipping_cents, v_total_cents,
    v_coupon_result.coupon_id, p_shipping_address, p_shipping_method, p_notes
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
  jsonb, jsonb, text, text, text, text, text, text, text
) to anon, authenticated;

-- =============================================================================
-- cancel_order: cancelamento administrativo — repõe estoque e registra
-- movimentação. Apenas admin/operador podem cancelar.
-- =============================================================================
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_movement record;
begin
  if not public.is_admin_or_operator() then
    raise exception 'Sem permissão para cancelar pedidos.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  if v_order.status in ('cancelled', 'refunded', 'delivered') then
    raise exception 'Pedido não pode ser cancelado no status atual (%).', v_order.status;
  end if;

  for v_movement in
    select * from public.inventory_movements where order_id = p_order_id and type = 'sale'
  loop
    update public.inventory set quantity = quantity + abs(v_movement.quantity_delta)
      where id = v_movement.inventory_id;

    insert into public.inventory_movements (inventory_id, type, quantity_delta, reason, order_id, created_by)
    values (
      v_movement.inventory_id, 'cancellation', abs(v_movement.quantity_delta),
      coalesce(p_reason, 'Cancelamento do pedido'), p_order_id, auth.uid()
    );
  end loop;

  update public.orders set status = 'cancelled' where id = p_order_id;

  perform public.write_audit_log(
    'order_cancelled', 'order', p_order_id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason)
  );
end;
$$;

grant execute on function public.cancel_order(uuid, text) to authenticated;
