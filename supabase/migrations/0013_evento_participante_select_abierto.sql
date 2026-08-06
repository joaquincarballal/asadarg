-- evento_participante_select seguía restringido a "solo tus eventos" (is_participant),
-- a pesar de que evento_select ya es público desde 0008_invitados.sql. Eso hacía que
-- listarMisEventos() y las queries de statsService.ts (obtenerAsistencia,
-- obtenerRankingAsadores, obtenerStatsHistoricas.cantidadAsados) quedaran todas
-- implícitamente scopeadas a la participación propia vía el embed
-- `evento_participante!inner()`, rompiendo el % de asistencia (FR-023): todos
-- terminaban con 100% porque solo veían los asados a los que ya fueron.
--
-- Se abre a "cualquier autenticado" (mismo criterio que evento_select) para que el
-- grupo completo, y sus asistencias, se calculen sobre el total real de asados.

drop policy evento_participante_select on evento_participante;

create policy evento_participante_select on evento_participante for select
  to authenticated using (true);
