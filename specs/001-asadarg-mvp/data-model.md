# Data Model: Asadarg MVP

Todas las tablas viven en Supabase Postgres. `participante` extiende `auth.users` (no la
reemplaza) mediante una tabla `perfil` 1:1.

## Entidades

### `perfil` (Participante)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK, FK → auth.users.id) | Mismo id que el usuario de Supabase Auth |
| nombre | text | De Google, editable |
| avatar_url | text | De Google |
| created_at | timestamptz | |

### `evento`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre | text | Requerido |
| fecha | date | Requerido |
| asador_titular_id | uuid (FK → perfil.id, nullable) | Opcional (FR-005) |
| estado | text: `abierto` \| `cerrado` | Default `abierto` |
| creado_por | uuid (FK → perfil.id) | |
| created_at | timestamptz | |
| closed_at | timestamptz, nullable | Se completa al cerrar (FR-018) |

**Validación**: una vez `estado = cerrado`, ninguna fila de `gasto` o `gasto_participante`
asociada a este evento puede insertarse/editarse/borrarse (FR-019) — enforced vía RLS +
trigger, no solo en el cliente.

### `evento_participante` (tabla puente)
| Campo | Tipo | Notas |
|---|---|---|
| evento_id | uuid (FK → evento.id) | |
| participante_id | uuid (FK → perfil.id) | |
| joined_at | timestamptz | |

Unique constraint: `(evento_id, participante_id)`. Un participante se agrega a esta tabla
automáticamente al entrar por el link de invitación (FR-004, unión directa sin aprobación).

### `foto_evento`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| evento_id | uuid (FK → evento.id) | |
| storage_path | text | Path en el bucket de Supabase Storage |
| subida_por | uuid (FK → perfil.id) | |
| created_at | timestamptz | |

### `corte_carne` (catálogo compartido, editable — FR-010)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre | text, unique | Ej: "Asado/Tira", "Vacío", "Entraña", "Chorizo", etc. |
| created_at | timestamptz | |

Precargado con: asado/tira, vacío, matambre, entraña, bondiola, chorizo, morcilla,
chinchulines, mollejas, riñones, pollo, cerdo, provoleta (seed inicial, ampliable por
cualquier participante).

### `concepto_extra_sugerido` (catálogo compartido, opcional)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre | text, unique | Ej: "carbón", "hielo", "pan", "chimichurri", "ensaladas" |

Solo son sugerencias — un gasto de Extras acepta texto libre igual (FR-011).

### `gasto`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| evento_id | uuid (FK → evento.id) | |
| categoria | text: `carne` \| `extra` | |
| corte_id | uuid (FK → corte_carne.id), nullable | Requerido si categoria=carne |
| kilogramos | numeric, nullable | Requerido si categoria=carne |
| concepto | text, nullable | Requerido si categoria=extra |
| monto_ars | numeric | Requerido (FR-009/FR-011) |
| cotizacion_usd_venta | numeric, nullable | Null si dolarapi.com no respondió (FR-020) |
| monto_usd | numeric, nullable | `monto_ars / cotizacion_usd_venta`, null si no hay cotización |
| precio_por_kg | numeric, nullable | Solo carne: `monto_ars / kilogramos` (FR-013) |
| pagador_id | uuid (FK → perfil.id) | Quién pagó (FR-009/FR-011) |
| cargado_por_id | uuid (FK → perfil.id) | Quién hizo la carga (puede ser otro — FR-007) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Check constraint**: (`categoria = 'carne'` AND `corte_id IS NOT NULL` AND
`kilogramos IS NOT NULL`) OR (`categoria = 'extra'` AND `concepto IS NOT NULL`).

### `gasto_participante` (división del gasto)
| Campo | Tipo | Notas |
|---|---|---|
| gasto_id | uuid (FK → gasto.id) | |
| participante_id | uuid (FK → perfil.id) | |
| proporcion | numeric | Suma de proporciones del mismo `gasto_id` = 1 |

Un participante excluido de un gasto (FR-016) simplemente no tiene fila acá. Reparto
equitativo por defecto = una fila por participante del evento con `proporcion = 1/N`
(FR-015). **Validación**: debe existir al menos una fila por `gasto_id` (FR-017).

### `settlement` (snapshot calculado al cierre del evento)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| evento_id | uuid (FK → evento.id) | |
| de_participante_id | uuid (FK → perfil.id) | Quién paga |
| a_participante_id | uuid (FK → perfil.id) | Quién recibe |
| monto_ars | numeric | |
| pagado | boolean | Default `false` — marcado manualmente (FR-019b), no hay pago real |
| pagado_at | timestamptz, nullable | Se completa cuando `pagado` pasa a `true` |
| created_at | timestamptz | Igual a `evento.closed_at` |

Se genera una única vez, atómicamente, al cerrar el evento (ver
`contracts/close-event-rpc.md`). No se recalcula después salvo que se reabra el evento
(fuera de scope v1 — ver Assumptions en spec.md). Marcar `pagado = true` es la única
escritura permitida sobre una fila de `settlement` después de creada — no se edita monto
ni origen/destino.

## Relaciones

```text
perfil 1──* evento (creado_por, asador_titular_id)
perfil *──* evento (vía evento_participante)
evento 1──* foto_evento
evento 1──* gasto
gasto  *──1 corte_carne (si categoria=carne)
gasto  1──* gasto_participante *──1 perfil
evento 1──* settlement (de/a perfil)
```

## Estadísticas derivadas (no son tablas, son queries/vistas)

- **Contador histórico** (FR-021): `SUM(kilogramos)`, `SUM(monto_ars)`, `SUM(monto_usd)`,
  `COUNT(DISTINCT evento.id)` sobre todos los eventos del grupo.
- **% asistencia** (FR-022): `COUNT(evento_participante WHERE participante_id = X) /
  COUNT(evento total)`.
- **Ranking Asadores Titulares** (FR-023): `COUNT(*) GROUP BY asador_titular_id ORDER BY
  COUNT DESC`.
- **Stats por evento** (FR-025): agregados de `gasto` filtrados por `evento_id`, dividido
  por `COUNT(evento_participante)` para el per cápita.
- **Tendencia de precio/kg** (FR-025b): `AVG(precio_por_kg) GROUP BY date_trunc('month',
  gasto.created_at)` sobre gastos `categoria = 'carne'` de los últimos 6 meses,
  cross-evento.

Estas se implementan como vistas SQL (`vista_stats_historicas`,
`vista_stats_evento`) o queries directas desde el cliente — decisión de implementación,
no bloquea el modelo de datos.
