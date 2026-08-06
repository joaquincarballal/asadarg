-- División dinámica por default: un gasto se divide entre TODOS los
-- participantes actuales del evento, y se reajusta solo cuando alguien se
-- suma o se baja del evento — no hace falta tocar el gasto a mano.
--
-- Si alguien edita a mano la división de un gasto puntual (por ej. sacar a
-- Martín de un vino que no tomó), esa persona puntual queda afuera de ESE
-- gasto (division_manual = true, solo a fines informativos). Gente nueva que
-- se suma al evento después sigue entrando a ese gasto igual que a
-- cualquier otro — la exclusión manual es específica de quien se sacó, no
-- una foto congelada del gasto. Si esa persona se baja del evento por
-- completo, igual se la saca de cualquier gasto en el que esté (fijo o no,
-- ver 0014) porque ya no es parte del asado.

alter table gasto add column division_manual boolean not null default false;

-- Alta: suma al nuevo participante a TODOS los gastos del evento (incluidos
-- los editados a mano), reajustando a partes iguales entre los que quedan.
create function evento_participante_propagar_alta()
returns trigger
language plpgsql
as $$
declare
  v_gasto record;
  v_n int;
begin
  for v_gasto in
    select id from gasto where evento_id = new.evento_id
  loop
    select count(*) into v_n from gasto_participante where gasto_id = v_gasto.id;
    v_n := v_n + 1;

    insert into gasto_participante (gasto_id, participante_id, proporcion)
    values (v_gasto.id, new.participante_id, 1.0 / v_n)
    on conflict (gasto_id, participante_id) do nothing;

    update gasto_participante
    set proporcion = 1.0 / v_n
    where gasto_id = v_gasto.id;
  end loop;

  return new;
end;
$$;

create trigger evento_participante_after_insert
  after insert on evento_participante
  for each row execute function evento_participante_propagar_alta();

-- crear_gasto ahora recibe si la división fue armada a mano (excluye a
-- alguien) o es la equitativa por default entre todos — determina si el
-- gasto queda fijo o sigue el ritmo del evento de ahí en más.
drop function crear_gasto(
  uuid, text, uuid, numeric, text, numeric, numeric, numeric, numeric, uuid, uuid, jsonb
);

create function crear_gasto(
  p_evento_id uuid,
  p_categoria text,
  p_corte_id uuid,
  p_kilogramos numeric,
  p_concepto text,
  p_monto_ars numeric,
  p_cotizacion_usd_venta numeric,
  p_monto_usd numeric,
  p_precio_por_kg numeric,
  p_pagador_id uuid,
  p_cargado_por_id uuid,
  p_division jsonb,
  p_division_manual boolean
)
returns gasto
language plpgsql
as $$
declare
  v_gasto gasto;
begin
  insert into gasto (
    evento_id, categoria, corte_id, kilogramos, concepto, monto_ars,
    cotizacion_usd_venta, monto_usd, precio_por_kg, pagador_id, cargado_por_id,
    division_manual
  ) values (
    p_evento_id, p_categoria, p_corte_id, p_kilogramos, p_concepto, p_monto_ars,
    p_cotizacion_usd_venta, p_monto_usd, p_precio_por_kg, p_pagador_id, p_cargado_por_id,
    p_division_manual
  )
  returning * into v_gasto;

  insert into gasto_participante (gasto_id, participante_id, proporcion)
  select v_gasto.id, (d->>'participanteId')::uuid, (d->>'proporcion')::numeric
  from jsonb_array_elements(p_division) as d;

  return v_gasto;
end;
$$;

grant execute on function crear_gasto(
  uuid, text, uuid, numeric, text, numeric, numeric, numeric, numeric, uuid, uuid, jsonb, boolean
) to authenticated;

-- Edita a mano la división de un gasto puntual (por ej. sacar a alguien que
-- no tomó vino) sin sacarlo del evento. Marca el gasto como manual
-- (informativo); gente nueva que se sume al evento igual entra a este gasto
-- (ver evento_participante_propagar_alta), y si alguien se baja del evento
-- entero lo sigue afectando igual (trigger de 0014).
create function actualizar_division_gasto(p_gasto_id uuid, p_participante_ids uuid[])
returns void
language plpgsql
as $$
declare
  v_evento_id uuid;
  v_n int;
begin
  if array_length(p_participante_ids, 1) is null then
    raise exception 'Un gasto no puede excluir a todos los participantes.';
  end if;

  select evento_id into v_evento_id from gasto where id = p_gasto_id;

  if exists (
    select 1 from unnest(p_participante_ids) as pid
    where not exists (
      select 1 from evento_participante ep
      where ep.evento_id = v_evento_id and ep.participante_id = pid
    )
  ) then
    raise exception 'Solo se puede dividir entre participantes del evento.';
  end if;

  v_n := array_length(p_participante_ids, 1);

  delete from gasto_participante where gasto_id = p_gasto_id;

  insert into gasto_participante (gasto_id, participante_id, proporcion)
  select p_gasto_id, pid, 1.0 / v_n
  from unnest(p_participante_ids) as pid;

  update gasto set division_manual = true where id = p_gasto_id;
end;
$$;

grant execute on function actualizar_division_gasto(uuid, uuid[]) to authenticated;
