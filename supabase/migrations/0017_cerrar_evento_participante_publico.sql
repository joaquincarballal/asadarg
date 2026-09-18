-- Cierra evento_participante_select (era `using (true)` desde 0013, necesario para
-- abrir la app al público): cualquier autenticado podía ver quién fue a cualquier
-- asado, no solo a los propios. Vuelve a is_participant(evento_id).
--
-- evento sigue público (using true) a propósito -- "Asados del Grupo"
-- (listarTodosLosEventos) necesita listar nombre/fecha/estado de todos para poder
-- descubrir y unirte a uno. Solo se cierra el detalle de asistencia, no la lista.
--
-- Esto rompe el mismo problema que 0013 estaba arreglando (statsService.ts
-- necesita leer evento_participante cruzando TODOS los usuarios para calcular %
-- de asistencia, no solo el propio). stats_participaciones() lo resuelve con
-- privilegio elevado, pero devolviendo únicamente perfil (sin evento_id): permite
-- contar cuántos asados asistió cada uno sin exponer a cuáles específicamente.

drop policy evento_participante_select on evento_participante;

create policy evento_participante_select on evento_participante for select
  to authenticated using (is_participant(evento_id));

create function stats_participaciones()
returns table (perfil jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p.*) as perfil
  from evento_participante ep
  join perfil p on p.id = ep.participante_id
  where p.es_invitado = false;
$$;

grant execute on function stats_participaciones() to authenticated;
