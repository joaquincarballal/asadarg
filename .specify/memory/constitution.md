<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections: Core Principles (5), Stack Fijo, UI y Tono, Manejo de Fotos, Governance
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ generic "Constitution Check" gate, no edit needed (reads this file at plan time)
  - .specify/templates/spec-template.md ✅ no constitution-specific references found
  - .specify/templates/tasks-template.md ✅ no constitution-specific references found
- Follow-up TODOs: none
-->

# Asadarg Constitution

## Core Principles

### I. Simplicidad Ante Todo (NON-NEGOTIABLE)
Asadarg es un proyecto hobby para uso entre un grupo cerrado de amigos, no un producto
comercial. Toda decisión de diseño o implementación DEBE priorizar la opción más simple
que resuelva el problema. Está PROHIBIDO agregar roles de usuario complejos, panel de
administración, internacionalización (i18n), o cualquier feature "enterprise" que no
esté explícitamente pedida. Ante la duda entre una solución simple y una "más correcta"
pero compleja, se elige la simple. YAGNI aplica siempre.
**Rationale**: el proyecto lo mantiene y paga una sola persona para un grupo chico;
la complejidad innecesaria es el principal riesgo de abandono del proyecto.

### II. Costo Cero (NON-NEGOTIABLE)
Toda la infraestructura DEBE operar dentro de los free tiers de sus proveedores
(Supabase, Cloudflare Pages, Cloudflare Workers). Está PROHIBIDO introducir servicios
o features que impliquen costos recurrentes sin aprobación explícita previa. El
Cloudflare Worker de keep-alive (cron semanal pingueando Supabase) es parte del diseño
base precisamente para evitar la pausa por inactividad del free tier de Supabase.
**Rationale**: es un proyecto de amigos sin modelo de monetización; superar el free
tier rompe la premisa del proyecto.

### III. Stack Fijo (NON-NEGOTIABLE)
El stack tecnológico está decidido y NO debe re-evaluarse ni discutirse en cada
feature o plan: Frontend PWA con Vite + React (mobile-first, instalable con manifest
+ service worker); Backend Supabase free tier (Auth con Google, Postgres, Storage);
Deploy en Cloudflare Pages vía `wrangler`; Keep-alive vía Cloudflare Worker con cron
semanal. Cualquier cambio de stack requiere enmienda explícita de esta constitución,
no una decisión ad-hoc durante planning o implementación.
**Rationale**: evita parálisis por análisis y mantiene consistencia entre features;
el stack ya fue elegido pensando en costo $0 y simplicidad operativa.

### IV. UI en Español Argentino, Tono Asadero
Toda la interfaz de usuario (textos, labels, mensajes de error, notificaciones) DEBE
estar en español rioplatense, con tono informal y con guiños a la cultura del asado
argentino. No se traduce a otros idiomas (i18n está fuera de scope, ver Principio I).
**Rationale**: la app es para un grupo de amigos argentinos; la formalidad o el
soporte multi-idioma no aportan valor y sí complejidad.

### V. Testing Mínimo Viable, Enfocado en el Core
No se exige TDD estricto ni cobertura exhaustiva. El testing automatizado es
OBLIGATORIO únicamente para la lógica de división de gastos (cálculo de shares,
exclusiones, proporciones) y el algoritmo de settlements (minimización de
transferencias), por ser la lógica con mayor riesgo de bugs silenciosos y mayor
costo de un error (plata real entre amigos). El resto de la app (UI, integraciones)
puede probarse manualmente.
**Rationale**: concentrar el esfuerzo de testing donde un bug afecta directamente
la confianza del grupo en los números, sin frenar la velocidad de desarrollo con
disciplina TDD innecesaria para una app hobby.

## Restricciones de Fotos

Las fotos de eventos DEBEN comprimirse client-side a un máximo aproximado de ~200KB
antes de subirse a Supabase Storage. Esto es una restricción dura de diseño, no una
optimización opcional, dado el límite de almacenamiento del free tier de Supabase.

## Governance

Esta constitución tiene precedencia sobre cualquier otra práctica, plantilla o
convención dentro del proyecto. Todo plan (`/speckit-plan`) y toda tarea
(`/speckit-tasks`) DEBEN verificar cumplimiento contra estos principios antes de
avanzar a implementación.

**Enmiendas**: cualquier cambio a esta constitución (agregar/quitar/redefinir un
principio, o cambiar el stack fijo) requiere que el cambio se documente explícitamente
en esta misma sesión de trabajo con el mantenedor del proyecto, incrementando la
versión según semver:
- MAJOR: eliminación o redefinición incompatible de un principio o del stack fijo.
- MINOR: nuevo principio o sección agregada, o expansión material de una guía existente.
- PATCH: aclaraciones, redacción, correcciones no semánticas.

**Revisión de cumplimiento**: cualquier violación a un principio NON-NEGOTIABLE
(Simplicidad, Costo Cero, Stack Fijo) detectada durante planning DEBE resolverse
simplificando el approach, no justificando la excepción — salvo que el mantenedor
apruebe explícitamente la excepción y quede registrada en el plan correspondiente.

**Version**: 1.0.0 | **Ratified**: 2026-07-19 | **Last Amended**: 2026-07-19
