-- Fix (T045): crear un evento hace INSERT ... RETURNING (PostgREST
-- `Prefer: return=representation`), que evalúa la policy de SELECT sobre la fila
-- recién insertada. El trigger `evento_add_creator` (AFTER INSERT) que suma al
-- creador a `evento_participante` corre después de esa evaluación, así que
-- `is_participant(id)` todavía da false en ese instante y el INSERT vuelve con
-- "new row violates row-level security policy" pese a que el WITH CHECK del
-- insert es correcto. Se agrega `creado_por = auth.uid()` como alternativa en la
-- policy de SELECT — no amplía acceso real (el creador siempre termina siendo
-- participante vía el trigger), solo cubre esta ventana de la misma transacción.

drop policy evento_select on evento;
create policy evento_select on evento for select
  to authenticated using (is_participant(id) or creado_por = auth.uid());
