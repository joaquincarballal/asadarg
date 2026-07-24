-- Asadarg: GRANTs de tabla para el rol `authenticated` (fix post-deploy).
-- Las policies de RLS (0002_rls.sql) no alcanzan sin el GRANT de Postgres subyacente:
-- sin esto, cualquier acceso es "permission denied for table X" antes de evaluar RLS.
-- El proyecto real no trae los default privileges que sí tiene el stack local.

grant usage on schema public to authenticated;

grant select, update on perfil to authenticated;
grant select, insert, update on evento to authenticated;
grant select, insert on evento_participante to authenticated;
grant select, insert on foto_evento to authenticated;
grant select, insert on corte_carne to authenticated;
grant select, insert on concepto_extra_sugerido to authenticated;
grant select, insert, update, delete on gasto to authenticated;
grant select, insert, update, delete on gasto_participante to authenticated;
grant select, update on settlement to authenticated;
