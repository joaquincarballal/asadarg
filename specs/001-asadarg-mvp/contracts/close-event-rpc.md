# Contrato interno: cierre de evento (Postgres RPC)

Cerrar un evento y calcular sus settlements DEBE ser una operación atómica — si dos
participantes lo cierran casi al mismo tiempo, no puede terminar en settlements duplicados
o inconsistentes. Se expone como una función Postgres invocada vía
`supabase.rpc('cerrar_evento', { evento_id })`, no como lógica pura de cliente.

## Firma

```sql
cerrar_evento(p_evento_id uuid) RETURNS SETOF settlement
```

## Precondiciones

- El evento existe y `estado = 'abierto'` (si ya está `cerrado`, la función es no-op y
  devuelve los settlements ya existentes — idempotente).
- Quien llama es participante del evento (enforced por RLS).

## Comportamiento

1. Toma un lock a nivel de fila sobre el `evento` (`SELECT ... FOR UPDATE`) para evitar
   cierres concurrentes.
2. Calcula el balance neto de cada participante: `SUM(gasto.monto_ars * proporcion)
   correspondido` vs. `SUM(gasto.monto_ars) pagado` (solo gastos de ese evento).
3. Corre el algoritmo de minimización de transferencias (mismo algoritmo que
   `web/src/lib/settlements.ts`, ver `research.md` §5) sobre esos balances.
4. Inserta una fila en `settlement` por cada transferencia resultante.
5. Actualiza `evento.estado = 'cerrado'` y `evento.closed_at = now()`.
6. Todo dentro de una única transacción.

## Postcondiciones

- `evento.estado = 'cerrado'`.
- Existe al menos una fila en `settlement` por cada transferencia necesaria (puede ser
  cero filas si todos los balances ya estaban en cero).
- Ninguna fila de `gasto` o `gasto_participante` de este evento admite más
  inserts/updates/deletes (enforced por RLS, ver `data-model.md`).

## Errores

- Si el evento no existe o el usuario no es participante → error de autorización
  (RLS deniega la llamada).
