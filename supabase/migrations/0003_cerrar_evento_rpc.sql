-- Asadarg: cierre atómico de evento + cálculo de settlements (T011)
-- Contrato completo en specs/001-asadarg-mvp/contracts/close-event-rpc.md

create function cerrar_evento(p_evento_id uuid)
returns setof settlement
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_participant_count int;
  v_max_id uuid;
  v_max_bal numeric;
  v_min_id uuid;
  v_min_bal numeric;
  v_transfer numeric;
  v_i int;
begin
  -- Lock de fila para evitar cierres concurrentes del mismo evento.
  select estado into v_estado from evento where id = p_evento_id for update;

  if v_estado is null then
    raise exception 'Evento % no existe', p_evento_id;
  end if;

  if not is_participant(p_evento_id) then
    raise exception 'No sos participante de este evento';
  end if;

  if v_estado = 'cerrado' then
    -- Idempotente: si ya estaba cerrado, devuelve los settlements existentes.
    return query select * from settlement where evento_id = p_evento_id;
    return;
  end if;

  -- Balance neto por participante: lo que pagó menos lo que le correspondía pagar.
  create temporary table tmp_balances on commit drop as
  select
    ep.participante_id,
    coalesce(pagado.total, 0) - coalesce(corresponde.total, 0) as balance
  from evento_participante ep
  left join (
    select pagador_id, sum(monto_ars) as total
    from gasto
    where evento_id = p_evento_id
    group by pagador_id
  ) pagado on pagado.pagador_id = ep.participante_id
  left join (
    select gp.participante_id, sum(g.monto_ars * gp.proporcion) as total
    from gasto_participante gp
    join gasto g on g.id = gp.gasto_id
    where g.evento_id = p_evento_id
    group by gp.participante_id
  ) corresponde on corresponde.participante_id = ep.participante_id
  where ep.evento_id = p_evento_id;

  select count(*) into v_participant_count from tmp_balances;

  -- Algoritmo greedy de minimización de transferencias (research.md §5): empareja
  -- repetidamente al mayor acreedor con el mayor deudor. Termina en, como máximo,
  -- (participantes - 1) pasos, así que el loop está acotado por eso.
  for v_i in 1..greatest(v_participant_count - 1, 0) loop
    select participante_id, balance into v_max_id, v_max_bal
    from tmp_balances order by balance desc limit 1;

    select participante_id, balance into v_min_id, v_min_bal
    from tmp_balances order by balance asc limit 1;

    exit when v_max_bal < 0.01 or v_min_bal > -0.01 or v_max_id = v_min_id;

    v_transfer := round(least(v_max_bal, -v_min_bal), 2);

    insert into settlement (evento_id, de_participante_id, a_participante_id, monto_ars)
    values (p_evento_id, v_min_id, v_max_id, v_transfer);

    update tmp_balances set balance = balance - v_transfer where participante_id = v_max_id;
    update tmp_balances set balance = balance + v_transfer where participante_id = v_min_id;
  end loop;

  perform set_config('asadarg.allow_close', 'on', true);
  update evento set estado = 'cerrado', closed_at = now() where id = p_evento_id;
  perform set_config('asadarg.allow_close', 'off', true);

  return query select * from settlement where evento_id = p_evento_id;
end;
$$;

grant execute on function cerrar_evento(uuid) to authenticated;
