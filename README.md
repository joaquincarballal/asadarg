# Asadómetro 🔥

App para contabilizar y repartir los gastos de los asados entre un grupo de amigos —
estilo Tricount, con temática de asado argentino.

Construida con [GitHub Spec Kit](https://github.com/github/spec-kit) (Spec-Driven
Development). Toda la spec, el plan y las tareas viven en
[`specs/001-asadarg-mvp/`](specs/001-asadarg-mvp/).

## Stack

- **`web/`** — PWA con Vite + React + TypeScript, mobile-first, instalable.
- **`worker/`** — Cloudflare Worker con cron de keep-alive para Supabase.
- **`supabase/`** — Esquema Postgres, RLS y RPCs (migraciones SQL).

## Para arrancar

Ver [`specs/001-asadarg-mvp/quickstart.md`](specs/001-asadarg-mvp/quickstart.md) para
prerrequisitos, setup y cómo correr los tests.

```bash
cd web
npm install
npm run dev
```

## Documentación del proyecto

- [`constitution.md`](.specify/memory/constitution.md) — principios del proyecto
- [`spec.md`](specs/001-asadarg-mvp/spec.md) — qué hace la app y por qué
- [`plan.md`](specs/001-asadarg-mvp/plan.md) — cómo está construida
- [`data-model.md`](specs/001-asadarg-mvp/data-model.md) — esquema de datos
- [`tasks.md`](specs/001-asadarg-mvp/tasks.md) — desglose de tareas y estado
