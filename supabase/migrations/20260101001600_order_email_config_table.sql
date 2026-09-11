-- Substitui a abordagem de `alter database ... set app.*` (bloqueada em
-- projetos hospedados do Supabase — "permission denied to set parameter")
-- por uma tabela de configuração privada. Não exposta via API (schema
-- "private" não está em api.schemas) e sem policies de RLS que a exponham a
-- anon/authenticated — só acessível por funções SECURITY DEFINER e pela
-- service_role.
create schema if not exists private;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);

insert into private.app_config (key, value)
values ('functions_url', 'https://hdtowgnwrteayiqxydic.supabase.co/functions/v1')
on conflict (key) do update set value = excluded.value;

create or replace function public.notify_order_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_functions_url text;
  v_secret text;
begin
  select value into v_functions_url from private.app_config where key = 'functions_url';
  select value into v_secret from private.app_config where key = 'order_email_secret';

  if v_functions_url is null or v_secret is null then
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
