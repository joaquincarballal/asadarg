# Implementation Plan: Asadarg MVP — Gestión de Asados entre Amigos

**Branch**: `001-asadarg-mvp` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-asadarg-mvp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

App PWA instalable para registrar asados entre amigos: eventos con participantes y Asador
Titular, carga de gastos (Carne/Extras) con conversión automática a USD blue/MEP, división
tipo Tricount con settlements optimizados al cierre, y estadísticas históricas del grupo.
Approach técnico: frontend PWA (Vite + React) que habla directo con Supabase (Auth, Postgres,
Storage) sin backend propio — la lógica de negocio (splits, settlements, conversión USD)
vive en el cliente y en funciones SQL/RLS de Postgres donde haga falta integridad; un
Cloudflare Worker aparte hace ping periódico a Supabase para evitar la pausa por
inactividad del free tier.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node 20+ (tooling) — React 18 + Vite 5 en el
cliente; el Cloudflare Worker de keep-alive también en TypeScript.

**Primary Dependencies**: React, Vite, `@supabase/supabase-js` (auth/DB/storage),
`vite-plugin-pwa` (manifest + service worker), `browser-image-compression` (compresión
client-side de fotos a ~200KB), `wrangler` (deploy a Cloudflare Pages y al Worker). Sin
librería de charting — el único gráfico (tendencia de precio/kg) se hace a mano en SVG
(ver `research.md` §9).

**Diseño visual**: `specs/001-asadarg-mvp/design/` contiene los 6 mockups (Google Stitch)
y el design system (`asadarg_design_system/DESIGN.md`) que se adoptan como fuente de
verdad de UI — paleta, tipografía, spacing y shapes se trasladan directo a
`web/tailwind.config.js` (ver `research.md` §8).

**Storage**: Supabase Postgres (eventos, participantes, gastos, cortes de carne) +
Supabase Storage (fotos de eventos). Sin base de datos propia ni backend intermedio.

**Testing**: Vitest, exclusivamente para la lógica de división de gastos y el algoritmo de
settlements (Principio V de la constitución — testing mínimo viable, no TDD estricto).

**Target Platform**: Navegadores móviles modernos (PWA instalable, mobile-first); deploy
como sitio estático en Cloudflare Pages. Sin soporte específico de tiendas de apps (fuera
de scope v1).

**Project Type**: Web app de un solo frontend (PWA) contra un backend-as-a-service
(Supabase) — no hay proyecto "backend" separado que mantener, salvo el Worker de
keep-alive, que es un proyecto mínimo aparte.

**Performance Goals**: Carga inicial <3s en 4G típico; interacciones (crear evento, cargar
gasto) responden en <1s percibido. No hay requisito de tiempo real ni de alta concurrencia
(grupo chico de amigos, no miles de usuarios simultáneos).

**Constraints**: Costo $0/mes (todo dentro de free tiers); fotos comprimidas client-side a
~200KB antes de subir; sin backend propio corriendo 24/7 (todo o estático en Cloudflare
Pages, o serverless en Supabase/Workers); UI 100% en español rioplatense.

**Scale/Scope**: Un solo grupo cerrado de amigos (decenas de usuarios, no cientos), decenas
de eventos por año. Escala trivial — no se diseña para crecimiento más allá de esto (ver
Principio I, Simplicidad).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Simplicidad Ante Todo | ¿Se evitan roles complejos, admin panel, i18n? | ✅ PASS — sin roles (todos los participantes tienen los mismos permisos), sin panel admin, sin i18n. |
| II. Costo Cero | ¿Todo corre en free tiers? | ✅ PASS — Supabase free tier, Cloudflare Pages free, Cloudflare Workers free (cron dentro del límite de 3 triggers/worker y de la cuota diaria de invocaciones). |
| III. Stack Fijo | ¿Se usa exactamente Vite+React PWA / Supabase / Cloudflare Pages+Worker? | ✅ PASS — sin backend propio adicional; Supabase cubre Auth/DB/Storage directo desde el cliente. |
| IV. UI en Español Argentino | ¿El plan define copy en español/tono asadero? | ✅ PASS — convención de UI establecida para Phase 1 (todo string de interfaz en español rioplatense). |
| V. Testing Mínimo Viable | ¿Los tests se limitan a split/settlements? | ✅ PASS — Vitest solo sobre la lógica de división y settlements; resto validado manualmente. |
| Fotos ~200KB | ¿Hay paso de compresión client-side? | ✅ PASS — `browser-image-compression` antes de subir a Storage. |

Sin violaciones. No aplica la sección de Complexity Tracking.

**Re-chequeo post Phase 1**: el diseño de datos (`data-model.md`) y los contratos
(`contracts/`) no introducen roles, servicios pagos, ni desviaciones del stack fijo. El
único ajuste respecto a lo pedido textualmente es la cadencia del cron de keep-alive
(cada 3 días en vez de "semanal" literal) — justificado en `research.md` §2, no es una
violación de principios sino un ajuste de parámetro dentro del mismo Principio II (Costo
Cero). Gates siguen en ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/                        # PWA Vite + React — deploy a Cloudflare Pages
├── src/
│   ├── components/         # UI components (cards de evento, forms de gasto, etc.)
│   ├── pages/               # Rutas: login, home, evento, cierre/settlements, stats
│   ├── lib/
│   │   ├── supabase.ts      # Cliente Supabase (auth/db/storage)
│   │   ├── dolarapi.ts       # Fetch cotización blue/MEP
│   │   ├── splitting.ts      # Lógica de división de gastos (equitativa/custom)
│   │   ├── settlements.ts    # Algoritmo de minimización de transferencias
│   │   └── imageCompression.ts
│   ├── hooks/
│   └── types/
├── public/
│   ├── manifest.json
│   └── icons/
└── tests/
    └── unit/
        ├── splitting.test.ts
        └── settlements.test.ts

worker/                     # Cloudflare Worker — cron keep-alive a Supabase
├── src/
│   └── index.ts
└── wrangler.toml

supabase/                   # Config declarativa de Supabase (Supabase CLI)
├── migrations/              # Esquema: eventos, participantes, gastos, cortes
└── config.toml
```

**Structure Decision**: Un solo frontend PWA (`web/`) que habla directo con Supabase — no
hay "backend" propio que mantener, la lógica de negocio de splits/settlements corre
client-side (con Row Level Security en Postgres como capa de integridad/seguridad, no como
lógica de negocio). El único proceso server-side propio es el Worker de keep-alive
(`worker/`), deliberadamente mínimo. `supabase/` versiona el esquema de la base para poder
recrearlo si hace falta.

## Complexity Tracking

No aplica — el Constitution Check no registró violaciones.
