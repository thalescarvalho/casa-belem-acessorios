-- =============================================================================
-- Notificação por e-mail em mudanças de pedido.
--
-- Dispara automaticamente (via pg_net, chamada HTTP assíncrona — não trava a
-- transação) a Edge Function send-order-email sempre que um pedido é criado
-- ou muda de status. A função em si decide o template de e-mail conforme o
-- status recebido.
--
-- A URL das functions e o segredo compartilhado (para a Edge Function
-- confirmar que a chamada veio deste gatilho, não de qualquer request
-- externa) NÃO ficam nesta migration — são configurados separadamente via
-- `alter database ... set app.functions_url = '...'` e
-- `app.order_email_secret = '...'`, para não versionar segredos no Git.
-- Enquanto essas configurações não existirem, o gatilho simplesmente não
-- faz nada (não bloqueia a criação/atualização do pedido).
-- =============================================================================
create extension if not exists pg_net;

create or replace function public.notify_order_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_functions_url text := current_setting('app.functions_url', true);
  v_secret text := current_setting('app.order_email_secret', true);
begin
  if v_functions_url is null or v_secret is null or v_functions_url = '' or v_secret = '' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_event := 'order_created';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    v_event := new.status;
  else
    return new;
  end if;

  perform net.http_post(
    url := v_functions_url || '/send-order-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-order-email-secret', v_secret),
    body := jsonb_build_object('order_id', new.id, 'event', v_event)
  );

  return new;
end;
$$;

drop trigger if exists trg_orders_notify_email on public.orders;
create trigger trg_orders_notify_email
  after insert or update of status on public.orders
  for each row execute function public.notify_order_email();
