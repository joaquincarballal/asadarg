-- Permite borrar cortes del catálogo compartido (antes era append-only, FR-010 solo
-- pedía poder agregar). El FK de `gasto.corte_id -> corte_carne(id)` no tiene
-- ON DELETE, así que Postgres ya rechaza borrar un corte que esté en uso en algún
-- gasto — el cliente traduce ese error a un mensaje amigable.

create policy corte_carne_delete on corte_carne for delete
  to authenticated using (true);

grant delete on corte_carne to authenticated;
