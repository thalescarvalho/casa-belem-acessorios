-- Rastreamento de entrega: preenchido pelo admin/operador ao marcar o pedido
-- como "enviado". Sem integração automática com transportadora por enquanto
-- (ver README) — o código é digitado manualmente e exibido ao cliente.
alter table public.orders
  add column tracking_code text,
  add column carrier text,
  add column tracking_url text;
