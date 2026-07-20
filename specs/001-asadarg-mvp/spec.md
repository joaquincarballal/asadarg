# Feature Specification: Asadarg MVP — Gestión de Asados entre Amigos

**Feature Branch**: `001-asadarg-mvp`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: "Asadarg — app para contabilizar y parametrizar juntadas de asado entre amigos, estilo Tricount/Splitwise con temática de asado argentino. Login individual por participante (Google). Eventos = asados individuales con fecha, nombre, participantes, Asador Titular y fotos. Cualquier participante puede cargar gastos de Carne (corte, kg, monto ARS, pagador) y Extras (concepto, monto ARS, pagador), con captura automática de cotización USD blue/MEP del día y precio por kg. División de gastos estilo Tricount (default equitativa, ajustable por gasto) con cálculo de settlements optimizados al cierre. Estadísticas históricas cross-evento: kg totales, gasto total (ARS+USD), cantidad de asados, % asistencia, ranking de Asadores Titulares, y stats por evento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un evento y cargar los gastos del asado (Priority: P1)

Un participante crea un evento de asado (fecha, nombre), invita al resto del grupo mediante
un link, y a medida que se hacen las compras, cualquier participante carga los gastos de
carne (corte, kilos, monto) y extras (carbón, bebidas, pan, etc.), quedando todo registrado
con su pagador correspondiente.

**Why this priority**: Es el flujo mínimo indispensable — sin esto no hay app. Todo lo
demás (división, settlements, estadísticas) depende de que los eventos y gastos existan.

**Independent Test**: Se puede probar completamente creando un evento, invitando a 2-3
personas por link, y cargando 3-4 gastos (mezcla de carne y extras) — el resultado es
visible como un registro compartido del asado con los montos en ARS y su equivalente USD.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con Google, **When** crea un evento con fecha y nombre,
   **Then** el evento queda creado con ese usuario como participante y puede invitar a otros
   mediante un link.
2. **Given** un evento con participantes, **When** cualquier participante carga un gasto de
   Carne indicando corte, kilogramos, monto en ARS y quién pagó, **Then** el gasto queda
   guardado con el precio por kilogramo calculado y el equivalente en USD de ese día.
3. **Given** un evento con participantes, **When** cualquier participante carga un gasto de
   Extras indicando concepto, monto en ARS y quién pagó, **Then** el gasto queda guardado
   con su equivalente en USD de ese día.

---

### User Story 2 - Ver el reparto y saldar cuentas del evento (Priority: P2)

Con los gastos ya cargados, los participantes quieren saber cuánto le corresponde pagar a
cada uno y, al cerrar el evento, quién le tiene que transferir plata a quién para saldar
todo con la menor cantidad de transferencias posible.

**Why this priority**: Es el valor diferencial de la app frente a anotar gastos sueltos en
un chat grupal — resolver automáticamente quién le debe a quién.

**Independent Test**: Con un evento que ya tiene gastos cargados (de la Historia 1), se
puede abrir la vista de balances y ver, para cada participante, cuánto puso y cuánto le
corresponde pagar; al cerrar el evento, ver la lista de transferencias sugeridas.

**Acceptance Scenarios**:

1. **Given** un evento con gastos cargados y división por defecto (equitativa), **When** un
   participante abre la vista de balances, **Then** ve cuánto pagó, cuánto le corresponde
   pagar, y su saldo neto (a favor o en contra).
2. **Given** un gasto puntual, **When** quien lo carga excluye a uno o más participantes o
   ajusta las proporciones, **Then** el cálculo de balances refleja esa división custom en
   lugar de la equitativa por defecto.
3. **Given** un evento con balances calculados, **When** el evento se cierra, **Then** la
   app muestra la lista mínima de transferencias necesarias para saldar todas las deudas
   del evento.
4. **Given** una transferencia sugerida tras el cierre, **When** quien la recibe confirma
   que ya se la pagaron (botón "Pagar"), **Then** esa transferencia queda marcada como
   saldada, sin que la app mueva ni procese plata real.

---

### User Story 3 - Ver estadísticas históricas del grupo (Priority: P3)

Los participantes quieren ver, a lo largo del tiempo, cuánta carne comió el grupo, cuánto
gastaron en total, quién asiste más seguido, y quién ofició de Asador Titular más veces.

**Why this priority**: Es valor agregado sobre el registro básico de eventos — no bloquea
el uso principal de la app (cargar y saldar un asado) y puede entregarse después de las
Historias 1 y 2.

**Independent Test**: Con al menos dos eventos ya registrados (con gastos y participantes),
se puede abrir la pantalla de estadísticas y ver el acumulado histórico y el ranking de
Asadores Titulares.

**Acceptance Scenarios**:

1. **Given** al menos dos eventos registrados, **When** un participante abre las
   estadísticas del grupo, **Then** ve el total histórico de kilogramos de carne, el gasto
   total (en ARS nominal y en USD al momento de cada gasto), y la cantidad de asados
   realizados.
2. **Given** el historial de eventos del grupo, **When** un participante consulta su propio
   perfil o el ranking del grupo, **Then** ve su porcentaje de asistencia (asados asistidos
   / asados totales) y el ranking de quién ofició más veces de Asador Titular.
3. **Given** un evento puntual, **When** un participante abre las estadísticas de ese
   evento, **Then** ve el total de kilogramos, el gasto total, el gasto per cápita y el
   precio promedio por kilogramo de ese asado.
4. **Given** gastos de Carne cargados en los últimos 6 meses, **When** un participante abre
   las estadísticas del grupo, **Then** ve un gráfico de la evolución mensual del precio
   promedio por kilogramo en ese período.

---

### Edge Cases

- ¿Qué pasa si la cotización USD blue/MEP no está disponible (falla el servicio externo)
  en el momento de guardar un gasto? El gasto se guarda igual en ARS; el equivalente en USD
  queda marcado como no disponible en lugar de bloquear la carga (ver Assumptions).
- ¿Qué pasa si se suma un participante nuevo a un evento después de que ya se cargaron
  gastos? Los gastos ya registrados no se recalculan retroactivamente; el nuevo participante
  entra en la división de los gastos que se carguen de ahí en adelante.
- ¿Qué pasa si al ajustar una división custom de un gasto se terminan excluyendo todos los
  participantes? El sistema no debe permitir guardar una división sin al menos un
  participante incluido.
- ¿Qué pasa si un evento no tiene Asador Titular asignado? Debe poder quedar sin asignar
  (campo opcional) y completarse o cambiarse más adelante por cualquier participante.
- ¿Qué pasa si dos participantes cargan el mismo gasto por error (duplicado)? Fuera de
  scope de v1 una detección automática de duplicados; cualquier participante puede editar
  o borrar el gasto duplicado (ver FR-007), siempre que el evento no esté cerrado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir que cada usuario inicie sesión individualmente con
  su cuenta de Google.
- **FR-002**: Cualquier usuario autenticado DEBE poder crear un nuevo evento (asado)
  especificando al menos fecha y nombre.
- **FR-003**: Cualquier participante de un evento DEBE poder invitar a otras personas
  mediante un link de invitación compartible.
- **FR-004**: Una persona con el link de invitación DEBE poder sumarse al evento como
  participante autenticándose con Google, de forma automática y sin requerir aprobación
  de ningún participante existente.
- **FR-005**: Cada evento DEBE permitir designar a un participante como "Asador Titular",
  seleccionable y modificable entre los participantes del evento, con el campo pudiendo
  quedar sin asignar.
- **FR-006**: Cada evento DEBE permitir adjuntar una o más fotos.
- **FR-007**: Cualquier participante de un evento DEBE poder cargar, ver, editar y borrar
  cualquier gasto del evento (tanto los propios como los cargados por otros participantes),
  sin restricciones de rol o de autoría.
- **FR-008**: El sistema DEBE soportar dos categorías de gasto: Carne y Extras.
- **FR-009**: Para un gasto de Carne, el sistema DEBE registrar: corte (de una lista
  precargada de cortes argentinos), kilogramos, monto en ARS y quién pagó.
- **FR-010**: La lista de cortes de Carne DEBE ser editable — cualquier participante
  autenticado puede agregar nuevos cortes al catálogo compartido.
- **FR-011**: Para un gasto de Extras, el sistema DEBE registrar: concepto (texto libre o
  elegido de una lista sugerida), monto en ARS y quién pagó.
- **FR-012**: Al guardar cualquier gasto, el sistema DEBE capturar automáticamente la
  cotización del dólar blue/MEP del día y guardar el equivalente en USD junto al monto
  en ARS.
- **FR-013**: Para los gastos de Carne, el sistema DEBE calcular y guardar el precio por
  kilogramo.
- **FR-014**: Cada gasto DEBE tener un pagador y dividirse entre los participantes del
  evento.
- **FR-015**: Por defecto, cada gasto DEBE dividirse en partes iguales entre todos los
  participantes del evento.
- **FR-016**: El sistema DEBE permitir, por gasto individual, excluir participantes
  específicos de la división o ajustar las proporciones en lugar de usar el reparto
  equitativo por defecto.
- **FR-017**: El sistema DEBE prevenir que se guarde una división de gasto que excluya a
  todos los participantes (debe quedar al menos uno incluido).
- **FR-018**: Cualquier participante DEBE poder marcar un evento como "cerrado" en
  cualquier momento. Al cerrarse, el sistema DEBE calcular los settlements optimizados
  (quién le paga a quién) minimizando la cantidad de transferencias necesarias para saldar
  todas las deudas del evento.
- **FR-019**: Una vez cerrado un evento, el sistema NO DEBE permitir agregar, editar ni
  borrar gastos de ese evento; debe mostrar los settlements finales calculados al cierre.
- **FR-019b**: Cualquier participante DEBE poder marcar una transferencia (settlement)
  como pagada. Esto es un registro manual dentro de la app (bookkeeping) — la app NO
  procesa ni mueve dinero real; el pago en sí ocurre por fuera (transferencia bancaria,
  efectivo, etc.).
- **FR-020**: Si el servicio externo de cotización no responde al momento de guardar un
  gasto, el sistema DEBE guardar igual el gasto en ARS y marcar el equivalente en USD como
  no disponible, sin bloquear la carga.
- **FR-021**: Agregar un participante nuevo a un evento NO DEBE modificar retroactivamente
  la división de los gastos ya cargados antes de que se sumara.
- **FR-022**: El sistema DEBE mantener un contador histórico cross-evento de: kilogramos
  totales de carne consumidos, gasto total acumulado (en ARS nominal y en USD al momento de
  cada gasto), y cantidad de asados realizados.
- **FR-023**: El sistema DEBE calcular el porcentaje de asistencia de cada usuario (asados
  a los que asistió sobre el total de asados del grupo).
- **FR-024**: El sistema DEBE proveer un ranking o vista de Asadores Titulares mostrando
  cuántas veces ofició cada participante.
- **FR-025**: Para cada evento, el sistema DEBE mostrar: kilogramos totales, gasto total,
  gasto per cápita y precio promedio por kilogramo.
- **FR-025b**: El sistema DEBE mostrar la evolución mensual del precio promedio por
  kilogramo de carne de los últimos 6 meses, agregando los gastos de categoría Carne de
  todos los eventos del grupo en ese período.
- **FR-026**: La aplicación DEBE poder instalarse en el dispositivo móvil del usuario (agregar
  a pantalla de inicio / app instalable).
- **FR-027**: Todo el texto de cara al usuario DEBE estar en español rioplatense, con tono
  informal y con referencias a la cultura del asado argentino.

### Key Entities

- **Participante**: persona autenticada individualmente con Google; puede pertenecer a uno
  o más eventos; acumula historial de asistencia y de veces como Asador Titular.
- **Evento (Asado)**: fecha, nombre, lista de participantes, Asador Titular (opcional),
  una o más fotos, lista de gastos, estado de cierre.
- **Gasto**: categoría (Carne o Extras), monto en ARS, equivalente en USD (según cotización
  del día o marcado como no disponible), pagador, división entre participantes (equitativa
  por defecto o personalizada); si es de categoría Carne, además corte y kilogramos.
- **Corte de Carne**: catálogo compartido y editable de cortes disponibles para elegir al
  cargar un gasto de Carne.
- **Settlement**: transferencia sugerida (origen, destino, monto) resultante del cálculo
  de cierre de un evento, que minimiza la cantidad total de transferencias; incluye si
  fue marcada como pagada (registro manual, sin procesamiento real de pago).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un participante puede crear un evento nuevo e invitar al resto del grupo en
  menos de 2 minutos.
- **SC-002**: Cargar un gasto (de carne o extra) toma menos de 30 segundos desde que se
  abre el formulario de carga.
- **SC-003**: Al cerrar un evento, cualquier participante puede ver exactamente cuánto le
  deben o cuánto debe, sin tener que hacer ningún cálculo manual.
- **SC-004**: La cantidad de transferencias sugeridas para saldar un evento es siempre menor
  o igual a la que resultaría de saldar cada deuda pagador-por-pagador sin optimizar.
- **SC-005**: Un participante puede ver el resumen histórico del grupo (kg totales, gasto
  total, cantidad de asados, ranking de asadores) en una sola pantalla.
- **SC-006**: El equivalente en USD de cada gasto queda disponible sin que el usuario tenga
  que calcularlo o ingresarlo manualmente.

## Assumptions

- El grupo que usa la app es cerrado y de confianza (amigos); no se contempla moderación
  de contenido ni verificación de identidad más allá del login con Google.
- La fuente de la cotización USD blue/MEP es un servicio público externo gratuito (p. ej.
  dolarapi.com); es una dependencia externa fuera del control de la app.
- El catálogo de cortes de carne y de conceptos sugeridos de extras es compartido
  globalmente entre todos los eventos del grupo (no hay catálogos separados por evento).
- No hay límite de cantidad de participantes por evento ni de eventos históricos dentro
  del alcance de v1.
- El diseño visual de referencia (paleta, tipografía, layout de cada pantalla) vive en
  `specs/001-asadarg-mvp/design/` (mockups estáticos exportados de Google Stitch) y se
  adopta como fuente de verdad de UI — no reemplaza esta spec funcional, la complementa.
- La app sirve a un único grupo de amigos; no se contemplan múltiples grupos o comunidades
  aisladas entre sí (ver Fuera de Scope).
- **Fuera de scope v1** (explícito): notificaciones push, pagos integrados (MercadoPago),
  múltiples grupos/comunidades, modo offline completo, publicación en app stores.
