# Confirmación de asistencia + invitados por proxy

**Fecha**: 2026-07-24
**Feature relacionada**: `specs/001-asadarg-mvp/spec.md` (extiende FR-003, FR-004; modifica FR-023)
**Estado**: Diseño aprobado por el usuario, pendiente de plan de implementación.

## Contexto y problema

Hoy (FR-004), cualquier persona con el link de invitación de un evento se suma
automáticamente como participante apenas se loguea con Google — sin ningún paso de
confirmación. Esto no refleja la realidad del grupo: no todos los testers van a ir a
todos los asados, y se necesita una confirmación explícita de asistencia.

Además, se pidió una forma de que una sola persona (ya confirmada) pueda sumar a otros
al evento sin que cada uno tenga que entrar a la app — tanto para gente que ya tiene
cuenta en AsadARG (testers ya registrados) como para invitados externos de una sola vez
que nunca van a tener cuenta.

## Alcance

- Confirmación explícita de asistencia (reemplaza el auto-join silencioso de FR-004).
- Un participante ya confirmado puede sumar a otros testers ya registrados directamente
  (sin que esa persona confirme nada — queda confirmada al toque).
- Un participante ya confirmado puede cargar un invitado externo (sin cuenta) escribiendo
  su nombre.
- El creador de un evento sigue quedando adentro automáticamente (sin cambios).
- Los invitados sin cuenta se excluyen del cálculo de % de asistencia (FR-023), pero
  participan en todo lo demás del evento (gastos, pagador, Asador Titular) igual que
  cualquier participante.

### Fuera de alcance (explícito)

- No hay mecanismo para "reclamar"/fusionar un invitado con una cuenta real si esa
  persona termina logueándose después — queda como usuario nuevo separado.
- No hay tracking de invitaciones pendientes/no respondidas — solo existe "confirmado" o
  "no está en el evento", no hay estado intermedio.
- No hay forma de "desconfirmar"/sacar a alguien de un evento (límite preexistente, no
  se toca en esta feature).

## Diseño

### 1. Modelo de datos

- `perfil` pierde el FK duro `references auth.users (id)` (hoy obliga a que toda fila
  sea una cuenta real de Google) y el default de `id` pasa a `gen_random_uuid()`.
- Se agrega `perfil.es_invitado boolean not null default false`.
- Las filas de usuario real se siguen creando **únicamente** vía el trigger existente
  `handle_new_user()` (dispara en `auth.users` insert, `security definer`) — nada
  cambia ahí.
- Una fila de invitado es un `perfil` con `es_invitado = true`, sin cuenta de
  `auth.users` asociada.
- **Nada más del esquema cambia**: `gasto.pagador_id`, `gasto_participante`,
  `evento.asador_titular_id`, `evento_participante` siguen referenciando `perfil(id)`
  sin modificación — un invitado se comporta como cualquier participante dentro de ese
  evento puntual.

### 2. RLS

- `evento_select`: se amplía de `is_participant(id) OR creado_por = auth.uid()` a
  `to authenticated using (true)`. Cualquier usuario logueado puede leer nombre/fecha/
  estado de un evento aunque todavía no sea participante — necesario para mostrar el
  preview antes de confirmar. No expone un "listado de todos los eventos": las
  pantallas que listan eventos (`listarMisEventos`) ya usan un inner join contra
  `evento_participante`, que sigue filtrado por RLS a la propia membresía.
- `evento_participante_insert`: se amplía de `participante_id = auth.uid()` a
  `participante_id = auth.uid() OR is_participant(evento_id)`. Cubre dos casos:
  confirmar la propia asistencia (todavía no sos participante, pero te estás insertando
  a vos mismo), y agregar a otra persona (ya sos participante del evento).
- `perfil` insert (policy nueva): `to authenticated with check (es_invitado = true)`.
  Cualquier autenticado puede crear una fila de invitado, pero nunca una fila de
  usuario "real" por esta vía — esas solo nacen del trigger de login.
- Grants de tabla: recordar sumar `insert` en `perfil` para `authenticated` (lección de
  la migración `0005_grants.sql` — las policies de RLS no alcanzan sin el GRANT de
  Postgres subyacente).

### 3. Backend (servicios TypeScript)

- `eventoService.ts`:
  - `unirseAEvento(eventoId)`: sin cambios en la lógica (sigue siendo un upsert
    `evento_id, participante_id`), pero deja de llamarse automáticamente al montar
    `UnirseEvento` — pasa a dispararse solo con el click de "Sí, voy".
  - Nueva función `obtenerEventoPreview(eventoId)`: lee `evento` (nombre, fecha) sin
    requerir ser participante, para la pantalla de confirmación.
  - Nueva función `agregarParticipanteExistente(eventoId, participanteId)`: inserta en
    `evento_participante` a nombre de otra persona (requiere que el caller ya sea
    participante — lo garantiza la policy).
  - Nueva función `agregarInvitado(eventoId, nombre)`: inserta un `perfil` con
    `es_invitado: true` y el nombre dado, y lo suma a `evento_participante` en el mismo
    flujo.
  - Nueva función `listarTestersDisponibles(eventoId)`: trae perfiles con
    `es_invitado = false` que no estén ya en `evento_participante` para ese evento
    (para el buscador de "+ Agregar gente").
- `statsService.ts`:
  - `obtenerAsistencia()`: al recorrer `evento_participante → perfil`, se descartan las
    filas con `perfil.es_invitado = true` antes de calcular el porcentaje.

### 4. UI

- **Nueva sección "Participantes"** en `EventoDetalle.tsx`: lista de avatar + nombre de
  los confirmados; los invitados llevan una etiqueta visual "Invitado".
- **Botón "+ Agregar gente"** (visible solo si el usuario actual ya es participante):
  abre un panel con (a) buscador/lista de testers ya registrados que todavía no están
  en el evento, cada uno con un botón para sumarlo directo, y (b) un campo de texto
  libre + botón para cargar un invitado externo por nombre. Mismo patrón visual que
  "Gestionar cortes" (toggle + panel inline, cierra con click afuera).
- **`UnirseEvento.tsx`** deja de auto-unir en el `useEffect`. Pasa a:
  1. Traer el preview del evento (nombre, fecha) vía `obtenerEventoPreview`.
  2. Mostrar "¿Confirmás tu asistencia a **{nombre}** el {fecha}?" con un botón
     "Sí, voy" (dispara `unirseAEvento` y navega al detalle) y un link "Ahora no"
     (vuelve a Inicio sin unirse).
  3. Si el usuario ya es participante (re-visita el link), redirige directo al detalle
     sin mostrar el paso de confirmación (mismo chequeo que ya hace el resto de la app
     vía RLS/estado de `evento_participante`).
- El creador del evento no pasa por esta pantalla — sigue entrando automático vía el
  trigger `evento_add_creator` al crear el evento.

### 5. Estadísticas — qué cuenta y qué no

| Métrica | ¿Incluye invitados? |
|---|---|
| % de asistencia (FR-023) | No — se excluyen explícitamente |
| Ranking de Asadores Titulares (FR-024) | Sí — si ofició, cuenta |
| Kg totales / gasto total / cantidad de asados (FR-022) | Sí — son agregados del evento, no distinguen tipo de participante |

## Testing

- Tests unitarios nuevos para `obtenerAsistencia` con un mock que incluya al menos un
  `perfil.es_invitado = true`, verificando que no entra en el cálculo.
- Validación manual (siguiendo el patrón de `quickstart.md`): confirmar asistencia
  propia vía link, agregar un tester existente desde otro participante, cargar un
  invitado por nombre, verificar que ambos aparecen en balance/gastos/Asador Titular,
  y que solo el tester real cuenta en Estadísticas → Asistencia.

## Migraciones necesarias

Nueva migración (siguiente número disponible tras `0007_corte_carne_delete.sql`):
columna `es_invitado`, drop del FK `perfil.id → auth.users.id`, default
`gen_random_uuid()` en `perfil.id`, policies de `evento_select` /
`evento_participante_insert` actualizadas, policy + grant de insert nuevos en `perfil`.
