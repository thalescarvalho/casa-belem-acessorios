-- Extensões necessárias
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "pg_trgm" with schema public;

-- Função utilitária para manter updated_at sempre atualizado
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
