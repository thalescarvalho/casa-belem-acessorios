-- Agenda de publicação: o evento pode ser cadastrado com antecedência mas só
-- aparecer publicamente a partir de uma data escolhida (ex.: evento dia
-- 15/09, mas só aparece no site a partir de 13/09). Se publish_at for nulo,
-- aparece assim que "active" for true (comportamento anterior).
--
-- event_time: horário do evento (opcional), exibido junto da data —
-- principalmente relevante para os próximos eventos.
alter table public.events
  add column publish_at date,
  add column event_time time;

drop policy if exists "events_public_read_active" on public.events;
create policy "events_public_read_active"
  on public.events for select
  using (
    public.is_admin()
    or (active and (publish_at is null or now()::date >= publish_at))
  );
