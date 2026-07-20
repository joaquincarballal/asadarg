---

description: "Task list template for feature implementation"
---

# Tasks: Asadarg MVP — Gestión de Asados entre Amigos

**Input**: Design documents from `/specs/001-asadarg-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluidos únicamente para `splitting.ts` y `settlements.ts` — es lo único que
la constitución (Principio V) exige testear automáticamente. El resto se valida a mano
siguiendo `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye el path de archivo exacto

## Path Conventions

Según `plan.md`: `web/` (PWA Vite+React), `worker/` (Cloudflare Worker keep-alive),
`supabase/` (migraciones y config).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización de los tres proyectos del repo

- [x] T001 Crear estructura de carpetas `web/`, `worker/`, `supabase/` per `plan.md`
- [x] T002 Inicializar proyecto Vite + React + TypeScript en `web/` (`npm create vite@latest`)
- [x] T003 [P] Instalar dependencias en `web/`: `@supabase/supabase-js`, `vite-plugin-pwa`,
      `browser-image-compression`
- [x] T004 [P] Inicializar Cloudflare Worker en `worker/` con `worker/wrangler.toml`
      (escrito a mano en vez del wizard interactivo — más confiable en modo no interactivo)
- [x] T005 [P] Inicializar config de Supabase en `supabase/` con `supabase/config.toml`
      (escrito a mano — el Supabase CLI no está instalado en este entorno; no hace falta
      para generar el archivo, solo para `db push`/`link` contra un proyecto real)
- [x] T006 [P] Configurar linting + formato en `web/`: `oxlint` (scaffolding default de
      create-vite actual) + Prettier agregado para formato
- [x] T007 Configurar Vitest en `web/` (`web/vitest.config.ts`, script `test` en
      `web/package.json`)

**Checkpoint**: los tres proyectos existen y compilan/arrancan vacíos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que TODAS las historias necesitan (esquema de datos, auth,
shell de la app)

**⚠️ CRITICAL**: ninguna historia de usuario arranca hasta terminar esta fase

- [x] T008 Crear migración de esquema en `supabase/migrations/0001_init.sql`: tablas
      `perfil`, `evento`, `evento_participante`, `foto_evento`, `corte_carne`,
      `concepto_extra_sugerido`, `gasto`, `gasto_participante`, `settlement` — campos y
      constraints según `data-model.md`
- [x] T009 Agregar seed data de `corte_carne` (asado/tira, vacío, matambre, entraña,
      bondiola, chorizo, morcilla, chinchulines, mollejas, riñones, pollo, cerdo,
      provoleta) y `concepto_extra_sugerido` (carbón, hielo, pan, chimichurri, bebidas,
      ensaladas) en `supabase/migrations/0001_init.sql`
- [x] T010 Escribir políticas RLS en `supabase/migrations/0002_rls.sql`: solo
      participantes de un evento pueden leer/escribir sus gastos y fotos; ningún insert/
      update/delete en `gasto` ni `gasto_participante` si `evento.estado = 'cerrado'`
      (FR-019). Incluye además: trigger que suma al creador como participante, guarda de
      cierre (`evento_guard_close`) e inmutabilidad de settlements salvo `pagado`.
- [x] T011 Implementar función `cerrar_evento(p_evento_id uuid)` en
      `supabase/migrations/0003_cerrar_evento_rpc.sql` según
      `contracts/close-event-rpc.md` (depende de T008)
- [x] T012 [P] Crear bucket de Storage `fotos-eventos` + políticas RLS en
      `supabase/migrations/0004_storage.sql` según `contracts/storage.md`
- [ ] T013 [P] Habilitar y configurar el provider de Google en Supabase Auth (dashboard/
      config del proyecto Supabase) — **pendiente**: requiere crear el proyecto Supabase
      real y credenciales OAuth de Google Cloud (cuenta del usuario). `supabase/config.toml`
      ya deja `[auth.external.google]` armado para leer `GOOGLE_CLIENT_ID`/`SECRET` por env.
- [x] T014 [P] Implementar cliente Supabase en `web/src/lib/supabase.ts`
- [x] T015 [P] Implementar `web/src/lib/dolarapi.ts` (fetch blue + MEP, manejo de fallo
      según `contracts/dolarapi.md`)
- [x] T016 [P] Implementar `web/src/lib/imageCompression.ts` (wrapper de
      `browser-image-compression`, `maxSizeMB: 0.2`)
- [x] T017 Implementar shell de la app en `web/src/`: routing, layout base, pantalla de
      login con Google (`web/src/pages/Login.tsx`), guard de rutas autenticadas (depende
      de T014)
- [x] T018 Configurar PWA (`vite-plugin-pwa`) en `web/vite.config.ts` + manifest inline
      (Tailwind v4 no usa `tailwind.config.js` — ver T018b)
- [x] T018b [P] Trasladar el design system de
      `specs/001-asadarg-mvp/design/asadarg_design_system/DESIGN.md` (colores, tipografía,
      spacing, shapes) a `web/src/index.css` vía `@theme` (Tailwind v4 es CSS-first, ya no
      usa `tailwind.config.js`), e importar Montserrat + Be Vietnam Pro en `web/index.html`

**Checkpoint**: esquema de datos con RLS listo, la app compila y levanta con un shell
navegable y el theme de Asadarg aplicado. Login con Google queda con el código listo pero
sin poder probarse end-to-end hasta que exista un proyecto Supabase real (T013).

---

## Phase 3: User Story 1 - Crear un evento y cargar los gastos (Priority: P1) 🎯 MVP

**Goal**: cualquier participante puede crear un evento, invitar al resto, y cargar gastos
de Carne y Extras con conversión automática a USD y precio por kg.

**Independent Test**: crear un evento, invitar a 2-3 personas por link, cargar 3-4 gastos
mezclando Carne y Extras — quedan guardados con su equivalente USD y (si aplica) precio
por kg.

### Tests for User Story 1

- [x] T019 [P] [US1] Vitest: casos de `splitting.ts` (equitativo, exclusión, proporciones
      custom, error al excluir a todos — FR-017) en `web/tests/unit/splitting.test.ts`
      — **escribir antes de implementar `splitting.ts`, debe fallar primero**

### Implementation for User Story 1

- [x] T020 [P] [US1] Definir tipos `Evento`, `Gasto`, `Participante`, `CorteCarne` en
      `web/src/types/index.ts`
- [x] T021 [US1] Implementar `web/src/lib/splitting.ts` (división equitativa por defecto,
      exclusión/proporciones custom, validación "al menos un participante" — FR-015,
      FR-016, FR-017) — hace pasar T019 (6/6 tests OK)
- [x] T022 [US1] Implementar creación de evento (fecha, nombre) en
      `web/src/pages/CrearEvento.tsx` (depende de T014, T017)
- [x] T023 [US1] Implementar generación de link de invitación y unión automática sin
      aprobación al abrirlo (FR-004) en `web/src/pages/UnirseEvento.tsx`
- [x] T024 [US1] Implementar selector de Asador Titular (opcional, editable entre
      participantes) en `web/src/components/AsadorTitularSelect.tsx`
- [x] T025 [US1] Implementar subida de fotos del evento en
      `web/src/components/FotosEvento.tsx` (usa T016 compresión + `contracts/storage.md`)
- [x] T026 [US1] Implementar `web/src/lib/gastoService.ts`: guardar gasto capturando
      cotización USD (T015) y calculando precio/kg si es Carne, con fallback si la
      cotización falla (FR-012, FR-013, FR-020)
- [x] T027 [US1] Implementar formulario único de carga de gasto con toggle Carne/Extras
      (corte dropdown editable + kg cuando es Carne; concepto libre/sugerido cuando es
      Extras; monto ARS y pagador en ambos casos), según
      `design/cargar_gasto_asadarg/code.html`, en `web/src/components/FormGasto.tsx`
      (depende de T021, T026)
- [x] T029 [US1] Implementar listado de gastos del evento, visible y cargable por
      cualquier participante, con edición/borrado abierto a todos (FR-007) en
      `web/src/pages/EventoDetalle.tsx`

**Checkpoint**: User Story 1 implementada de punta a punta (build + tests OK). Falta la
validación manual real, que depende de tener un proyecto Supabase provisionado (T013).

---

## Phase 4: User Story 2 - Ver el reparto y saldar cuentas (Priority: P2)

**Goal**: ver balances en vivo por participante y, al cerrar el evento, la lista mínima de
transferencias para saldar todo.

**Independent Test**: con gastos ya cargados (Historia 1), abrir la vista de balances y
ver cuánto puso y cuánto le corresponde a cada uno; al cerrar, ver los settlements.

### Tests for User Story 2

- [x] T030 [P] [US2] Vitest: casos de `settlements.ts` con distintos sets de balances,
      confirmando que la cantidad de transferencias es ≤ al enfoque ingenuo
      pagador-por-pagador (SC-004) en `web/tests/unit/settlements.test.ts` — **escribir
      antes de implementar, debe fallar primero**

### Implementation for User Story 2

- [x] T031 [US2] Implementar `web/src/lib/settlements.ts` (algoritmo greedy de
      minimización de transferencias, ver `research.md` §5) — hace pasar T030 (4/4 tests OK)
- [x] T032 [US2] Implementar vista de balances en vivo (pagado / corresponde / saldo neto
      por participante) en `web/src/pages/Balances.tsx` (depende de T021)
- [x] T033 [US2] Implementar `cerrarEvento()` en `web/src/lib/eventoService.ts`, invocando
      el RPC `cerrar_evento` (`contracts/close-event-rpc.md`, depende de T011)
- [x] T034 [US2] Implementar vista de settlements finales post-cierre en
      `web/src/pages/Settlements.tsx` (depende de T033), según `design/saldos_asadarg/code.html`
- [x] T034b [US2] Implementar acción "Pagar" (marcar settlement como `pagado`, sin
      procesar pago real — FR-019b) en `web/src/lib/eventoService.ts` y el botón
      correspondiente en `web/src/pages/Settlements.tsx` (depende de T034)
- [x] T035 [US2] Deshabilitar en la UI la carga/edición/borrado de gastos cuando
      `evento.estado = 'cerrado'` (FR-019) en `web/src/pages/EventoDetalle.tsx`

**Checkpoint**: Historias 1 y 2 implementadas juntas (build + tests OK); validación manual
end-to-end pendiente de un proyecto Supabase real.

---

## Phase 5: User Story 3 - Ver estadísticas históricas del grupo (Priority: P3)

**Goal**: contador histórico cross-evento, % de asistencia, ranking de Asadores
Titulares, y stats por evento puntual.

**Independent Test**: con al menos dos eventos ya registrados, abrir estadísticas y ver
el acumulado histórico y el ranking.

### Implementation for User Story 3

- [x] T036 [US3] ~~Vistas SQL~~ — implementado como queries directas desde el cliente en
      `web/src/lib/statsService.ts` en vez de vistas SQL (alternativa ya habilitada en
      `data-model.md` § "Estadísticas derivadas"); no se creó `0005_stats_views.sql`
- [x] T037 [P] [US3] Implementar `web/src/lib/statsService.ts`: queries de % asistencia
      (FR-022), ranking de Asadores Titulares (FR-023), contador histórico (FR-022/FR-021)
      y tendencia de precio/kg (FR-025b)
- [x] T038 [P] [US3] Implementar pantalla de estadísticas del grupo (kg totales, gasto
      total ARS+USD, cantidad de asados, ranking, % asistencia) en
      `web/src/pages/EstadisticasGrupo.tsx`, según `design/estad_sticas_asadarg/code.html`
- [x] T038b [P] [US3] Implementar `web/src/components/PrecioKgChart.tsx` (line chart SVG
      a mano, sin librería — `research.md` §9) y conectarlo en `EstadisticasGrupo.tsx`
- [x] T039 [P] [US3] Implementar sección de estadísticas por evento (kg totales, gasto
      total, per cápita, precio promedio/kg) en `web/src/pages/EstadisticasEvento.tsx`

**Checkpoint**: las tres historias implementadas de forma independiente y en conjunto
(build + tests OK); validación manual end-to-end pendiente de un proyecto Supabase real.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T040 [P] Revisión final de copy: todo el texto de cara al usuario en español
      rioplatense, tono informal/asadero (Principio IV) en `web/src/**` (escrito así desde
      el vamos, tomando frases del diseño — "Prendé el fuego", "Sumar al pozo", etc.)
- [x] T041 [P] Íconos y manifest final para instalación PWA en `web/public/` (generados
      desde `design/app_icon/icon_reference.png` con `sips`; manifest inline en
      `vite.config.ts` via `VitePWA`)
- [x] T042 Implementar Worker de keep-alive en `worker/src/index.ts` con cron trigger
      cada 3 días en `worker/wrangler.toml` (`research.md` §2) — validado con
      `wrangler deploy --dry-run` (sin necesitar login)
- [x] T043 [P] Revisión de seguridad RLS end-to-end — ver nota debajo
- [ ] T044 Deploy de `web/` a Cloudflare Pages (`wrangler pages deploy`) y de `worker/`
      (`wrangler deploy`) — **pendiente**: requiere `wrangler login` con la cuenta de
      Cloudflare del usuario; el build de producción ya corre limpio (`npm run build`)
- [ ] T045 Correr la validación manual completa de `quickstart.md` (Historias 1, 2 y 3) —
      **parcial**: automatizado verificado (`npm run test` 10/10, `npm run build` OK,
      `npx oxlint` sin warnings); el recorrido manual click-por-click requiere un proyecto
      Supabase real (T013) + deploy (T044)

**Nota de seguridad (T043)**: revisión manual de `0002_rls.sql`/`0004_storage.sql` — RLS
habilitado en las 9 tablas de negocio; `is_participant()`/`evento_is_open()` como
`security definer` con `search_path` fijo (evita hijacking); cierre de evento bloqueado a
nivel trigger (`evento_guard_close`, no solo en el cliente); settlements inmutables salvo
`pagado` (`settlement_guard_update`); Storage con RLS por carpeta = evento_id. Sin
hallazgos críticos para el alcance de un grupo cerrado de amigos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las historias
- **User Stories (Phase 3-5)**: dependen de Foundational; entre sí, dependencias mínimas
  (ver abajo)
- **Polish (Phase 6)**: depende de las historias que se quieran incluir en el release

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Es el MVP.
- **US2 (P2)**: depende de Foundational y de `splitting.ts` (T021, de US1) para calcular
  balances sobre los gastos ya divididos — no depende del resto de US1.
- **US3 (P3)**: depende de Foundational y de que existan eventos/gastos (US1) para tener
  datos que agregar — no depende de US2.

### Within Each User Story

- Tests antes que la implementación que testean (T019→T021, T030→T031)
- `splitting.ts`/`settlements.ts` (lógica pura) antes que las pantallas que los usan
- Historia completa antes de pasar a la siguiente prioridad (si se va secuencial)

### Parallel Opportunities

- Todas las tareas [P] de Setup (T003-T006) en paralelo
- Todas las tareas [P] de Foundational (T012-T016) en paralelo, una vez que T008-T011
  (esquema y RPC, que dependen entre sí) estén listos
- T019 (test) puede escribirse en paralelo a T020 (tipos) — ambas [P] antes de T021
- T037-T039 de US3 en paralelo entre sí una vez lista T036

---

## Parallel Example: User Story 1

```bash
# Tests + tipos en paralelo antes de la lógica de división:
Task: "Vitest de splitting.ts en web/tests/unit/splitting.test.ts"
Task: "Definir tipos Evento/Gasto/Participante en web/src/types/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 sola)

1. Fase 1: Setup
2. Fase 2: Foundational (crítico — bloquea todo)
3. Fase 3: User Story 1
4. **Parar y validar** con la sección "Historia 1" de `quickstart.md`
5. Deploy/demo si está listo

### Entrega incremental

1. Setup + Foundational → base lista
2. US1 → validar independientemente → deploy/demo (**MVP**)
3. US2 → validar independientemente → deploy/demo
4. US3 → validar independientemente → deploy/demo
5. Polish (Phase 6) al final, o intercalado si hace falta destrabar el deploy real
   (T042/T044 pueden adelantarse para tener el keep-alive corriendo desde el día 1)

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- [US1]/[US2]/[US3] = trazabilidad a la historia de usuario correspondiente
- Los tests (T019, T030) son las únicas pruebas automatizadas exigidas por la
  constitución — no agregar más suites sin que se pida explícitamente
- Commitear después de cada tarea o grupo lógico
- Parar en cada checkpoint para validar la historia de forma independiente
