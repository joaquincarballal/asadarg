# Quickstart: validar Asadarg MVP end-to-end

## Prerrequisitos

- Node 20+ y `npm`.
- Un proyecto Supabase (free tier) creado, con:
  - Google configurado como provider de Auth.
  - El esquema de `supabase/migrations/` aplicado (`supabase db push` o equivalente).
  - Bucket de Storage `fotos-eventos` creado (ver `contracts/storage.md`).
- `wrangler` autenticado contra una cuenta de Cloudflare (para Pages y el Worker).
- Variables de entorno en `web/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Setup

```bash
cd web
npm install
npm run dev
```

## Tests automatizados (lógica core)

```bash
cd web
npm run test
```

Debe cubrir, como mínimo (Principio V de la constitución):
- `splitting.test.ts`: división equitativa por defecto, exclusión de participantes,
  proporciones custom, y el caso de error "no se puede excluir a todos" (FR-017).
- `settlements.test.ts`: dado un set de balances de ejemplo, el número de transferencias
  resultantes es igual o menor al enfoque ingenuo pagador-por-pagador (SC-004).

## Validación manual — Historia 1 (crear evento y cargar gastos)

1. Loguearse con Google.
2. Crear un evento con fecha y nombre → **esperado**: queda creado, aparece el link de
   invitación.
3. Abrir el link de invitación en otra sesión/usuario → **esperado**: se suma como
   participante sin aprobación (FR-004).
4. Cargar un gasto de Carne (corte del dropdown, kilos, monto ARS, pagador) → **esperado**:
   queda guardado con precio por kg calculado y el equivalente USD del día.
5. Cargar un gasto de Extras (concepto libre, monto ARS, pagador) → **esperado**: mismo
   comportamiento, sin kilos/corte.
6. Desconectar la red y repetir el paso 4 → **esperado**: el gasto se guarda igual en ARS,
   marcado como "USD no disponible" (FR-020).

## Validación manual — Historia 2 (balances y settlements)

1. Con varios gastos cargados por distintos pagadores, abrir la vista de balances →
   **esperado**: cada participante ve cuánto pagó, cuánto le corresponde, y su saldo neto.
2. Ajustar la división de un gasto puntual (excluir a alguien) → **esperado**: el balance
   se recalcula reflejando la exclusión.
3. Cerrar el evento → **esperado**: aparece la lista mínima de transferencias sugeridas;
   ya no se pueden agregar ni editar gastos de ese evento (FR-019).

## Validación manual — Historia 3 (estadísticas)

1. Con al menos dos eventos cerrados, abrir la pantalla de estadísticas del grupo →
   **esperado**: total histórico de kg, gasto total (ARS + USD), cantidad de asados,
   ranking de Asadores Titulares y % de asistencia por usuario.
2. Abrir las estadísticas de un evento puntual → **esperado**: kg totales, gasto total,
   gasto per cápita y precio promedio por kg de ese evento.

## Deploy

```bash
# Frontend
cd web && npm run build && wrangler pages deploy dist

# Worker de keep-alive
cd worker && wrangler deploy
```

**Esperado**: el Worker queda con su cron trigger activo (cada 3 días, ver `research.md`
§2); se puede confirmar en el dashboard de Cloudflare que las ejecuciones programadas
corren sin error.
