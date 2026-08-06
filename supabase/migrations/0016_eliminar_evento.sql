-- Permite eliminar un evento completo (ej. un asado que se armó pero nunca se
-- hizo). Solo el creador puede hacerlo, tanto abierto como cerrado. Las tablas
-- hijas (gasto, gasto_participante, evento_participante, settlement,
-- foto_evento) ya tienen "on delete cascade" desde 0001_init.sql, así que se
-- limpian solas. Los archivos en Storage de foto_evento NO se borran acá
-- (quedan huérfanos, aceptado como tradeoff).

create policy evento_delete on evento for delete
  to authenticated using (creado_por = auth.uid());

grant delete on evento to authenticated;
