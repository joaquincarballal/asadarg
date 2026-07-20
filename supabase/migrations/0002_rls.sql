-- Asadarg: políticas RLS (T010)
-- Filosofía (ver plan.md): RLS es capa de integridad/seguridad, no lógica de negocio.
-- La lógica de división/settlements vive en el cliente y en la función cerrar_evento.

-- Agrega automáticamente al creador de un evento como su primer participante.
create function add_creator_as_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.evento_participante (evento_id, participante_id)
  values (new.id, new.creado_por)
  on conflict do nothing;
  return new;
end;
$$;

create trigger evento_add_creator
  after insert on evento
  for each row execute procedure add_creator_as_participant();

create function is_participant(p_evento_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from evento_participante
    where evento_id = p_evento_id and participante_id = auth.uid()
  );
$$;

create function evento_is_open(p_evento_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select estado = 'abierto' from evento where id = p_evento_id;
$$;

-- Guarda de cierre: 'abierto' -> 'cerrado' solo lo puede hacer la función
-- cerrar_evento (que setea asadarg.allow_close para esta transacción). Reabrir un
-- evento no está soportado en v1 (ver Assumptions en spec.md).
create function evento_guard_close()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'cerrado' and old.estado = 'abierto' then
    if coalesce(current_setting('asadarg.allow_close', true), '') <> 'on' then
      raise exception 'El cierre de un evento solo puede hacerse a través de cerrar_evento()';
    end if;
  elsif old.estado = 'cerrado' and new.estado = 'abierto' then
    raise exception 'No se puede reabrir un evento cerrado (fuera de scope v1)';
  end if;
  return new;
end;
$$;

create trigger evento_guard_close_trigger
  before update on evento
  for each row execute procedure evento_guard_close();

-- Un settlement es inmutable salvo por el flag "pagado" (FR-019b).
create function settlement_guard_update()
returns trigger
language plpgsql
as $$
begin
  if new.evento_id <> old.evento_id
     or new.de_participante_id <> old.de_participante_id
     or new.a_participante_id <> old.a_participante_id
     or new.monto_ars <> old.monto_ars then
    raise exception 'Un settlement no se puede editar, solo marcar como pagado';
  end if;
  return new;
end;
$$;

create trigger settlement_guard_update_trigger
  before update on settlement
  for each row execute procedure settlement_guard_update();

alter table perfil enable row level security;
alter table evento enable row level security;
alter table evento_participante enable row level security;
alter table foto_evento enable row level security;
alter table corte_carne enable row level security;
alter table concepto_extra_sugerido enable row level security;
alter table gasto enable row level security;
alter table gasto_participante enable row level security;
alter table settlement enable row level security;

-- perfil: cualquier usuario logueado puede ver nombre/avatar de cualquier otro
-- (grupo cerrado de amigos, sin datos sensibles acá) — solo edita el propio.
create policy perfil_select_all on perfil for select
  to authenticated using (true);
create policy perfil_update_own on perfil for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- evento: solo participantes lo ven/editan; cualquier autenticado puede crear uno
-- (quedando como su propio primer participante vía trigger).
create policy evento_select on evento for select
  to authenticated using (is_participant(id));
create policy evento_insert on evento for insert
  to authenticated with check (creado_por = auth.uid());
create policy evento_update on evento for update
  to authenticated using (is_participant(id)) with check (is_participant(id));

-- evento_participante: unión directa sin aprobación (FR-004) — el link de invitación
-- es, en la práctica, conocer el evento_id.
create policy evento_participante_select on evento_participante for select
  to authenticated using (is_participant(evento_id));
create policy evento_participante_insert on evento_participante for insert
  to authenticated with check (participante_id = auth.uid());

-- foto_evento
create policy foto_evento_select on foto_evento for select
  to authenticated using (is_participant(evento_id));
create policy foto_evento_insert on foto_evento for insert
  to authenticated with check (is_participant(evento_id) and subida_por = auth.uid());

-- Catálogos compartidos: cualquier autenticado lee y agrega (FR-010), append-only.
create policy corte_carne_select on corte_carne for select
  to authenticated using (true);
create policy corte_carne_insert on corte_carne for insert
  to authenticated with check (true);
create policy concepto_extra_select on concepto_extra_sugerido for select
  to authenticated using (true);
create policy concepto_extra_insert on concepto_extra_sugerido for insert
  to authenticated with check (true);

-- gasto: cualquier participante carga/edita/borra cualquier gasto (FR-007),
-- solo mientras el evento está abierto (FR-019).
create policy gasto_select on gasto for select
  to authenticated using (is_participant(evento_id));
create policy gasto_insert on gasto for insert
  to authenticated with check (
    is_participant(evento_id) and cargado_por_id = auth.uid() and evento_is_open(evento_id)
  );
create policy gasto_update on gasto for update
  to authenticated using (is_participant(evento_id) and evento_is_open(evento_id))
  with check (is_participant(evento_id) and evento_is_open(evento_id));
create policy gasto_delete on gasto for delete
  to authenticated using (is_participant(evento_id) and evento_is_open(evento_id));

-- gasto_participante: mismo criterio, vía el evento_id del gasto padre.
create policy gasto_participante_select on gasto_participante for select
  to authenticated using (
    is_participant((select evento_id from gasto where gasto.id = gasto_id))
  );
create policy gasto_participante_insert on gasto_participante for insert
  to authenticated with check (
    is_participant((select evento_id from gasto where gasto.id = gasto_id))
    and evento_is_open((select evento_id from gasto where gasto.id = gasto_id))
  );
create policy gasto_participante_update on gasto_participante for update
  to authenticated using (
    is_participant((select evento_id from gasto where gasto.id = gasto_id))
    and evento_is_open((select evento_id from gasto where gasto.id = gasto_id))
  );
create policy gasto_participante_delete on gasto_participante for delete
  to authenticated using (
    is_participant((select evento_id from gasto where gasto.id = gasto_id))
    and evento_is_open((select evento_id from gasto where gasto.id = gasto_id))
  );

-- settlement: solo lectura + marcar "pagado" para participantes. Las filas las crea
-- únicamente cerrar_evento() (security definer, bypassea RLS) — no hay policy de insert.
create policy settlement_select on settlement for select
  to authenticated using (is_participant(evento_id));
create policy settlement_update on settlement for update
  to authenticated using (is_participant(evento_id)) with check (is_participant(evento_id));
