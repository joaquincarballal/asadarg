-- Permite sacar participantes de un evento (hasta ahora solo se podía agregar).
-- Cualquier participante puede sacar a cualquier otro (mismo criterio permisivo que
-- ya usa evento_participante_insert para el proxy-add), incluido sacarse a sí mismo.
--
-- Guarda: no se puede sacar a alguien que ya tiene gastos asociados al evento (pagó
-- algo o está en la división de algún gasto) — evita balances fantasma, ya que
-- gasto.pagador_id y gasto_participante.participante_id referencian perfil(id)
-- directamente y no se limpiarían solos al borrar la fila de evento_participante.

create function evento_participante_guard_delete()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from gasto
    where evento_id = old.evento_id and pagador_id = old.participante_id
  ) or exists (
    select 1 from gasto_participante gp
    join gasto g on g.id = gp.gasto_id
    where g.evento_id = old.evento_id and gp.participante_id = old.participante_id
  ) then
    raise exception 'No se puede sacar a alguien que ya tiene gastos asociados a este evento.';
  end if;
  return old;
end;
$$;

create trigger evento_participante_guard_delete
  before delete on evento_participante
  for each row execute procedure evento_participante_guard_delete();

create policy evento_participante_delete on evento_participante for delete
  to authenticated using (is_participant(evento_id));

grant delete on evento_participante to authenticated;
