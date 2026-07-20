# Research: Asadarg MVP

## 1. Cotización USD blue/MEP (dolarapi.com)

**Decision**: Usar `GET https://dolarapi.com/v1/dolares/blue` para el dólar blue y
`GET https://dolarapi.com/v1/dolares/bolsa` para el MEP (dolarapi.com llama "Bolsa" al
dólar MEP). Ambos devuelven un objeto:

```json
{
  "moneda": "USD",
  "casa": "blue",
  "nombre": "Blue",
  "compra": 1510,
  "venta": 1530,
  "fechaActualizacion": "2026-07-19T21:00:00.000Z"
}
```

Se guarda el valor `venta` (precio de venta) como cotización de referencia — es el valor
que habitualmente se cita en medios argentinos para "el blue del día". El MEP se guarda
como dato adicional junto al blue por si en el futuro se quiere elegir cuál mostrar por
default (fuera de scope decidir esto ahora — se persisten ambos).

**Rationale**: endpoint público, gratuito, sin autenticación, ya validado con una llamada
real (ver arriba). Formato estable y simple de parsear.

**Alternatives considered**: Bluelytics (otra API pública argentina) — descartada porque
dolarapi.com fue la especificada explícitamente por el usuario.

## 2. Cadencia del Cloudflare Worker de keep-alive

**Decision**: Cron cada 3 días (`0 12 */3 * *` o equivalente), no exactamente semanal.

**Rationale**: Supabase pausa proyectos free tier tras **7 días** sin actividad de base de
datos (no alcanza con requests HTTP o visitas al dashboard — tiene que ser actividad real
sobre la DB). Un cron literalmente semanal deja cero margen: cualquier drift de reloj, un
fallo puntual de ejecución, o un despliegue que corra el Worker un poco tarde puede hacer
que el proyecto se pause igual. Correr cada 3 días dentro dentro del mismo Worker (todavía
muy por debajo del límite de 3 cron triggers por Worker del free tier, y de la cuota diaria
de invocaciones) da margen de sobra sin costo adicional — sigue siendo "un cron barato que
pinguea Supabase", solo que un poco más frecuente que la palabra literal "semanal".

**Nota para el usuario**: esto es una desviación menor de lo pedido textualmente ("cron
semanal") — si preferís mantenerlo estrictamente semanal asumiendo el riesgo, es un cambio
de una línea en `worker/wrangler.toml`.

**Alternatives considered**: Cron exactamente semanal (rechazado por el margen insuficiente
explicado arriba); servicios externos de uptime monitoring (UptimeRobot, etc.) — rechazados
porque agregan una dependencia externa más cuando ya tenemos Cloudflare Workers disponible
sin costo.

## 3. Compresión de fotos client-side

**Decision**: Librería `browser-image-compression` (npm), configurada con
`maxSizeMB: 0.2` (~200KB) y redimensionado automático antes de subir a Supabase Storage.

**Rationale**: librería madura, sin dependencias de servidor, corre en un Web Worker
interno (no bloquea la UI), y expone directamente un parámetro de tamaño máximo en MB que
mapea 1:1 con el requisito de la constitución (~200KB).

**Alternatives considered**: compresión manual vía `<canvas>` — descartada por ser más
código para mantener sin beneficio real sobre una librería ya probada.

## 4. PWA (manifest + service worker)

**Decision**: `vite-plugin-pwa` (basado en Workbox), con estrategia `autoUpdate` y
precaching de los assets estáticos de la app.

**Rationale**: integración directa con Vite (cero configuración manual de service worker),
generación automática de manifest e íconos, y es el estándar de facto para PWAs con Vite.

**Alternatives considered**: escribir el service worker a mano — descartado, complejidad
innecesaria para lo que resuelve `vite-plugin-pwa` out of the box (Principio I, Simplicidad).

## 5. Algoritmo de settlements (minimización de transferencias)

**Decision**: Implementación propia en `web/src/lib/settlements.ts` del algoritmo greedy
estándar de "debt simplification": calcular el balance neto de cada participante (pagado -
correspondido), separar en acreedores/deudores, y emparejar repetidamente al mayor acreedor
con el mayor deudor hasta saldar todos los balances. Es el mismo enfoque conceptual que usa
Tricount para su vista de balances.

**Rationale**: es un algoritmo simple (~30-40 líneas), bien conocido, y no requiere ninguna
librería externa. Sacarlo a una función pura y testeable con Vitest cumple directamente el
Principio V (testing mínimo viable, enfocado en esta lógica).

**Alternatives considered**: librerías npm de "expense splitting" de terceros — descartadas
por ser dependencias externas poco mantenidas para un algoritmo que es trivial de
implementar y de testear directamente.

## 6. Autenticación (Google via Supabase Auth)

**Decision**: Supabase Auth con el provider de Google OAuth habilitado en el proyecto
Supabase; el frontend usa `supabase.auth.signInWithOAuth({ provider: 'google' })`.

**Rationale**: es soporte nativo de Supabase Auth, cero código de backend adicional, y es
exactamente lo que pide la constitución (Stack Fijo).

**Alternatives considered**: ninguna — este punto está fijado por la constitución, no se
evaluaron alternativas (Principio III).

## 8. Diseño visual de referencia (Google Stitch)

**Decision**: Adoptar tal cual el design system y los 6 mockups exportados de Google
Stitch (`specs/001-asadarg-mvp/design/`) como fuente de verdad de UI: paleta de colores
(tokens M3 en `asadarg_design_system/DESIGN.md`), tipografía (Montserrat + Be Vietnam
Pro), spacing, shapes (`rounded-2xl` cards, botones pill) y copy en voseo. Se traduce a
`web/tailwind.config.js` como extensión del tema por defecto.

**Rationale**: el diseño ya resuelve exactamente lo que pedía la constitución (paleta
bandera argentina + tono asadero informal) y con más detalle del que hubiéramos definido
nosotros mismos — reusarlo evita rehacer trabajo de diseño. Los mockups también revelaron
dos decisiones de IA no explícitas en la spec original, ya incorporadas: (a) el formulario
de carga de gasto es uno solo con un toggle Carne/Extras, no dos formularios separados;
(b) el detalle de un evento usa tabs internos (Gastos / Balance / Stats) en vez de rutas
separadas top-level.

**Alternatives considered**: diseñar la UI desde cero durante la implementación —
descartado, ya existe un diseño validado por el usuario.

## 9. Gráfico de tendencia de precio/kg (FR-025b)

**Decision**: Implementar el line chart de "Precio del kg de asado — últimos 6 meses"
como un componente SVG propio en `web/src/components/PrecioKgChart.tsx` (path SVG
generado a partir de los puntos mensuales), sin agregar ninguna librería de charting.

**Rationale**: es un único gráfico simple (una línea, 6 puntos) — agregar una librería
completa de charting para esto sería sobre-ingeniería (Principio I, Simplicidad). Un
componente SVG a mano es ~30-40 líneas y queda testeable como el resto de la lógica pura
si hiciera falta.

**Alternatives considered**: Recharts / Chart.js — descartadas por ser dependencias
pesadas para un solo gráfico; se reconsideraría solo si a futuro se agregan más
visualizaciones.

## 10. Testing

**Decision**: Vitest para los tests unitarios de `splitting.ts` y `settlements.ts`.

**Rationale**: integra sin configuración adicional con un proyecto Vite, y es el runner de
testing estándar del ecosistema Vite/React.

**Alternatives considered**: Jest — descartado por requerir configuración extra de
transformación para ESM/Vite que Vitest ya resuelve de fábrica.
