-- El guard anterior (0012) bloqueaba sacar a alguien si tenía CUALQUIER gasto
-- asociado, sea porque pagó algo o porque estaba en la división de un gasto ajeno.
-- Eso es demasiado estricto para el caso real: alguien confirma asistencia, Santiago
-- y Martín compran cosas y las dividen entre todos (incluida esa persona), pero al
-- final no puede ir — el asado se hace igual. Esa persona debería poder bajarse del
-- evento y que su parte de esos gastos se redistribuya entre los que quedan.
--
-- Nuevo criterio:
--   - Si la persona PAGÓ algo → se sigue bloqueando. Ese dinero se lo deben igual,
--     y no hay forma automática de resolverlo sin intervención humana.
--   - Si solo está en la división (no pagó nada) → se permite sacarla, y se borra su
--     fila de gasto_participante en cada gasto de ese evento, renormalizando las
--     proporciones restantes para que sigan sumando 1 (preserva splits custom, no
--     solo el equitativo).
--   - Caso límite: si fuera la única persona en la división de algún gasto, se
--     bloquea (no hay a quién redistribuirle ese gasto).

create or replace function evento_participante_guard_delete()
returns trigger
language plpgsql
as $$
declare
  v_gasto record;
  v_restantes int;
begin
  if exists (
    select 1 from gasto
    where evento_id = old.evento_id and pagador_id = old.participante_id
  ) then
    raise exception 'No se puede sacar a alguien que pagó gastos de este evento.';
  end if;

  for v_gasto in
    select distinct g.id
    from gasto g
    join gasto_participante gp on gp.gasto_id = g.id
    where g.evento_id = old.evento_id and gp.participante_id = old.participante_id
  loop
    select count(*) into v_restantes
    from gasto_participante
    where gasto_id = v_gasto.id and participante_id <> old.participante_id;

    if v_restantes = 0 then
      raise exception 'No se puede sacar: quedaría un gasto sin nadie que lo pague.';
    end if;

    delete from gasto_participante
    where gasto_id = v_gasto.id and participante_id = old.participante_id;

    update gasto_participante
    set proporcion = proporcion / (
      select sum(proporcion) from gasto_participante where gasto_id = v_gasto.id
    )
    where gasto_id = v_gasto.id;
  end loop;

  return old;
end;
$$;
