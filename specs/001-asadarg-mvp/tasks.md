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

- [ ] T001 Crear estructura de carpetas `web/`, `worker/`, `supabase/` per `plan.md`
- [ ] T002 Inicializar proyecto Vite + React + TypeScript en `web/` (`npm create vite@latest`)
- [ ] T003 [P] Instalar dependencias en `web/`: `@supabase/supabase-js`, `vite-plugin-pwa`,
      `browser-image-compression`
- [ ] T004 [P] Inicializar Cloudflare Worker en `worker/` (`wrangler init`) con
      `worker/wrangler.toml`
- [ ] T005 [P] Inicializar config de Supabase en `supabase/` (`supabase init`) con
      `supabase/config.toml`
- [ ] T006 [P] Configurar ESLint + Prettier en `web/`
- [ ] T007 Configurar Vitest en `web/` (`web/vitest.config.ts`, script `test` en
      `web/package.json`)

**Checkpoint**: los tres proyectos existen y compilan/arrancan vacíos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que TODAS las historias necesitan (esquema de datos, auth,
shell de la app)

**⚠️ CRITICAL**: ninguna historia de usuario arranca hasta terminar esta fase

- [ ] T008 Crear migración de esquema en `supabase/migrations/0001_init.sql`: tablas
      `perfil`, `evento`, `evento_participante`, `foto_evento`, `corte_carne`,
      `concepto_extra_sugerido`, `gasto`, `gasto_participante`, `settlement` — campos y
      constraints según `data-model.md`
- [ ] T009 Agregar seed data de `corte_carne` (asado/tira, vacío, matambre, entraña,
      bondiola, chorizo, morcilla, chinchulines, mollejas, riñones, pollo, cerdo,
      provoleta) y `concepto_extra_sugerido` (carbón, hielo, pan, chimichurri, bebidas,
      ensaladas) en `supabase/migrations/0001_init.sql`
- [ ] T010 Escribir políticas RLS en `supabase/migrations/0002_rls.sql`: solo
      participantes de un evento pueden leer/escribir sus gastos y fotos; ningún insert/
      update/delete en `gasto` ni `gasto_participante` si `evento.estado = 'cerrado'`
      (FR-019)
- [ ] T011 Implementar función `cerrar_evento(p_evento_id uuid)` en
      `supabase/migrations/0003_cerrar_evento_rpc.sql` según
      `contracts/close-event-rpc.md` (depende de T008)
- [ ] T012 [P] Crear bucket de Storage `fotos-eventos` + políticas RLS en
      `supabase/migrations/0004_storage.sql` según `contracts/storage.md`
- [ ] T013 [P] Habilitar y configurar el provider de Google en Supabase Auth (dashboard/
      config del proyecto Supabase)
- [ ] T014 [P] Implementar cliente Supabase en `web/src/lib/supabase.ts`
- [ ] T015 [P] Implementar `web/src/lib/dolarapi.ts` (fetch blue + MEP, manejo de fallo
      según `contracts/dolarapi.md`)
- [ ] T016 [P] Implementar `web/src/lib/imageCompression.ts` (wrapper de
      `browser-image-compression`, `maxSizeMB: 0.2`)
- [ ] T017 Implementar shell de la app en `web/src/`: routing, layout base, pantalla de
      login con Google (`web/src/pages/Login.tsx`), guard de rutas autenticadas (depende
      de T014)
- [ ] T018 Configurar PWA (`vite-plugin-pwa`) en `web/vite.config.ts` + manifest base en
      `web/public/manifest.json`

**Checkpoint**: login con Google funciona, esquema de datos existe con RLS, la app
levanta con un shell navegable vacío.

---

## Phase 3: User Story 1 - Crear un evento y cargar los gastos (Priority: P1) 🎯 MVP

**Goal**: cualquier participante puede crear un evento, invitar al resto, y cargar gastos
de Carne y Extras con conversión automática a USD y precio por kg.

**Independent Test**: crear un evento, invitar a 2-3 personas por link, cargar 3-4 gastos
mezclando Carne y Extras — quedan guardados con su equivalente USD y (si aplica) precio
por kg.

### Tests for User Story 1

- [ ] T019 [P] [US1] Vitest: casos de `splitting.ts` (equitativo, exclusión, proporciones
      custom, error al excluir a todos — FR-017) en `web/tests/unit/splitting.test.ts`
      — **escribir antes de implementar `splitting.ts`, debe fallar primero**

### Implementation for User Story 1

- [ ] T020 [P] [US1] Definir tipos `Evento`, `Gasto`, `Participante`, `CorteCarne` en
      `web/src/types/index.ts`
- [ ] T021 [US1] Implementar `web/src/lib/splitting.ts` (división equitativa por defecto,
      exclusión/proporciones custom, validación "al menos un participante" — FR-015,
      FR-016, FR-017) — hace pasar T019
- [ ] T022 [US1] Implementar creación de evento (fecha, nombre) en
      `web/src/pages/CrearEvento.tsx` (depende de T014, T017)
- [ ] T023 [US1] Implementar generación de link de invitación y unión automática sin
      aprobación al abrirlo (FR-004) en `web/src/pages/UnirseEvento.tsx`
- [ ] T024 [US1] Implementar selector de Asador Titular (opcional, editable entre
      participantes) en `web/src/components/AsadorTitularSelect.tsx`
- [ ] T025 [US1] Implementar subida de fotos del evento en
      `web/src/components/FotosEvento.tsx` (usa T016 compresión + `contracts/storage.md`)
- [ ] T026 [US1] Implementar `web/src/lib/gastoService.ts`: guardar gasto capturando
      cotización USD (T015) y calculando precio/kg si es Carne, con fallback si la
      cotización falla (FR-012, FR-013, FR-020)
- [ ] T027 [US1] Implementar formulario de carga de gasto de Carne (corte del dropdown
      editable, kg, monto ARS, pagador) en `web/src/components/FormGastoCarne.tsx`
      (depende de T021, T026)
- [ ] T028 [US1] Implementar formulario de carga de gasto de Extras (concepto libre o
      sugerido, monto ARS, pagador) en `web/src/components/FormGastoExtra.tsx` (depende
      de T021, T026)
- [ ] T029 [US1] Implementar listado de gastos del evento, visible y cargable por
      cualquier participante, con edición/borrado abierto a todos (FR-007) en
      `web/src/pages/EventoDetalle.tsx`

**Checkpoint**: User Story 1 funciona de punta a punta y es demostrable sola.

---

## Phase 4: User Story 2 - Ver el reparto y saldar cuentas (Priority: P2)

**Goal**: ver balances en vivo por participante y, al cerrar el evento, la lista mínima de
transferencias para saldar todo.

**Independent Test**: con gastos ya cargados (Historia 1), abrir la vista de balances y
ver cuánto puso y cuánto le corresponde a cada uno; al cerrar, ver los settlements.

### Tests for User Story 2

- [ ] T030 [P] [US2] Vitest: casos de `settlements.ts` con distintos sets de balances,
      confirmando que la cantidad de transferencias es ≤ al enfoque ingenuo
      pagador-por-pagador (SC-004) en `web/tests/unit/settlements.test.ts` — **escribir
      antes de implementar, debe fallar primero**

### Implementation for User Story 2

- [ ] T031 [US2] Implementar `web/src/lib/settlements.ts` (algoritmo greedy de
      minimización de transferencias, ver `research.md` §5) — hace pasar T030
- [ ] T032 [US2] Implementar vista de balances en vivo (pagado / corresponde / saldo neto
      por participante) en `web/src/pages/Balances.tsx` (depende de T021)
- [ ] T033 [US2] Implementar `cerrarEvento()` en `web/src/lib/eventoService.ts`, invocando
      el RPC `cerrar_evento` (`contracts/close-event-rpc.md`, depende de T011)
- [ ] T034 [US2] Implementar vista de settlements finales post-cierre en
      `web/src/pages/Settlements.tsx` (depende de T033)
- [ ] T035 [US2] Deshabilitar en la UI la carga/edición/borrado de gastos cuando
      `evento.estado = 'cerrado'` (FR-019) en `web/src/pages/EventoDetalle.tsx`

**Checkpoint**: Historias 1 y 2 funcionan juntas de punta a punta.

---

## Phase 5: User Story 3 - Ver estadísticas históricas del grupo (Priority: P3)

**Goal**: contador histórico cross-evento, % de asistencia, ranking de Asadores
Titulares, y stats por evento puntual.

**Independent Test**: con al menos dos eventos ya registrados, abrir estadísticas y ver
el acumulado histórico y el ranking.

### Implementation for User Story 3

- [ ] T036 [US3] Crear vistas SQL `vista_stats_historicas` y `vista_stats_evento` en
      `supabase/migrations/0005_stats_views.sql` (agregados de `data-model.md` §
      "Estadísticas derivadas")
- [ ] T037 [P] [US3] Implementar `web/src/lib/statsService.ts`: queries de % asistencia
      (FR-022) y ranking de Asadores Titulares (FR-023) sobre `vista_stats_historicas`
      (depende de T036)
- [ ] T038 [P] [US3] Implementar pantalla de estadísticas del grupo (kg totales, gasto
      total ARS+USD, cantidad de asados, ranking, % asistencia) en
      `web/src/pages/EstadisticasGrupo.tsx`
- [ ] T039 [P] [US3] Implementar sección de estadísticas por evento (kg totales, gasto
      total, per cápita, precio promedio/kg) en `web/src/pages/EstadisticasEvento.tsx`

**Checkpoint**: las tres historias funcionan de forma independiente y en conjunto.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Revisión final de copy: todo el texto de cara al usuario en español
      rioplatense, tono informal/asadero (Principio IV) en `web/src/**`
- [ ] T041 [P] Íconos y `manifest.json` finales para instalación PWA en `web/public/`
- [ ] T042 Implementar Worker de keep-alive en `worker/src/index.ts` con cron trigger
      cada 3 días en `worker/wrangler.toml` (`research.md` §2)
- [ ] T043 [P] Revisión de seguridad RLS end-to-end: confirmar que nadie fuera de un
      evento puede leer sus gastos o fotos (usar `supabase/migrations/0002_rls.sql` y
      `0004_storage.sql` como checklist)
- [ ] T044 Deploy de `web/` a Cloudflare Pages (`wrangler pages deploy`) y de `worker/`
      (`wrangler deploy`)
- [ ] T045 Correr la validación manual completa de `quickstart.md` (Historias 1, 2 y 3)

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
