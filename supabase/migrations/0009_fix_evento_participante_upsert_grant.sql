-- 0009_fix_evento_participante_upsert_grant.sql
-- Fix: proxy-adding an existing tester (agregarParticipanteExistente) and
-- self-confirming attendance (unirseAEvento) both upsert onto evento_participante
-- with onConflict: 'evento_id,participante_id', which PostgREST turns into
-- `insert ... on conflict (...) do update`. Postgres requires UPDATE privilege
-- on the table for that statement shape regardless of whether a row actually
-- conflicts (https://www.postgresql.org/docs/current/sql-insert.html), and
-- 0005_grants.sql only granted select+insert on evento_participante. The
-- missing grant surfaced to the client as a 403 from PostgREST.
--
-- Also add the matching UPDATE policy: if the on-conflict path is ever really
-- taken (re-adding someone already in the event), RLS checks it against UPDATE
-- policies, and none existed — same criterion as the insert policy's
-- already-a-participant branch.

grant update on evento_participante to authenticated;

create policy evento_participante_update on evento_participante for update
  to authenticated using (is_participant(evento_id)) with check (is_participant(evento_id));
