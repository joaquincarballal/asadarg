# Confirmación de Asistencia + Invitados por Proxy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el auto-join silencioso a un evento por una confirmación explícita, y permitir que un participante ya confirmado sume a otros (testers ya registrados, o invitados externos sin cuenta) sin que esas personas tengan que loguearse.

**Architecture:** Una migración de Postgres agrega `perfil.es_invitado`, saca el FK duro de `perfil.id` a `auth.users`, y amplía 2 RLS policies + agrega una nueva. El resto es capa de aplicación: nuevas funciones en `eventoService.ts`, una función pura de cálculo de asistencia testeable (nuevo archivo `lib/asistencia.ts`, mismo patrón que `lib/settlements.ts`), un rediseño de `UnirseEvento.tsx` (de auto-join a preview+confirmar), y un componente nuevo `ParticipantesSection.tsx` integrado en `EventoDetalle.tsx`.

**Tech Stack:** React + TypeScript + Vite (web/), Supabase (Postgres + PostgREST + Auth) vía `@supabase/supabase-js`, Tailwind v4, Vitest.

## Global Constraints

- Todo texto de cara al usuario en español rioplatense informal (FR-027 de `specs/001-asadarg-mvp/spec.md`).
- Las migraciones se aplican al proyecto Supabase real (no hay entorno local) vía `npx supabase db push`, ejecutado desde la raíz del repo. **Siempre** exportar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (valores en `Notes.md`, gitignored) junto con `SUPABASE_ACCESS_TOKEN` al correr `db push` o `config push` — si no, el push pisa el client_id de Google con el placeholder sin resolver (bug real que ya pasó en este proyecto, ver `Notes.md`).
- Cada policy o GRANT nuevo debe verificarse con una query real post-deploy (lección de `0005_grants.sql`: una RLS policy sin el GRANT de tabla subyacente no alcanza).
- Tests automatizados solo para lógica pura sin I/O (mismo criterio que `splitting.ts`/`settlements.ts` — ver nota en `web/src/pages/../../specs/001-asadarg-mvp/tasks.md`). Código que llama a Supabase se valida a mano, no con vitest.
- Deploy de `web/` con `npx wrangler pages deploy dist --project-name asadarg` desde `web/` (build primero con `npm run build`). No pushear a `main` ni deployar a producción sin que el usuario lo pida explícitamente — usar un branch de preview (`--branch preview-<nombre>`) para mostrar avances.

---

### Task 1: Migración de esquema y RLS

**Files:**
- Create: `supabase/migrations/0008_invitados.sql`

**Interfaces:**
- Produces: columna `perfil.es_invitado boolean not null default false`; `perfil.id` sin FK a `auth.users` y con default `gen_random_uuid()`; policy `evento_select` ahora `using (true)`; policy `evento_participante_insert` ahora acepta auto-inserción o inserción por un participante existente; policy nueva `perfil_insert_invitado`; grant de `insert` en `perfil` para `authenticated`.

- [ ] **Step 1: Escribir la migración**

```sql
-- 0008_invitados.sql
-- Confirmación de asistencia + invitados por proxy (ver
-- docs/superpowers/specs/2026-07-24-confirmacion-asistencia-design.md).

-- 1. perfil deja de exigir una cuenta real de auth.users detrás de cada fila:
--    un "invitado" es una fila de perfil sin login propio.
alter table perfil add column es_invitado boolean not null default false;

do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.perfil'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass;
  if fk_name is not null then
    execute format('alter table public.perfil drop constraint %I', fk_name);
  end if;
end $$;

alter table perfil alter column id set default gen_random_uuid();

-- 2. evento: cualquier autenticado puede leer nombre/fecha/estado aunque todavía
--    no sea participante (necesario para el preview antes de confirmar asistencia).
--    Las pantallas que listan "mis eventos" ya filtran por membresía real vía un
--    inner join contra evento_participante (RLS-scoped), así que esto no expone
--    un browse de eventos ajenos.
drop policy evento_select on evento;
create policy evento_select on evento for select
  to authenticated using (true);

-- 3. evento_participante: además de sumarte a vos mismo (confirmar tu propia
--    asistencia), un participante ya confirmado puede sumar a cualquier otra
--    persona (proxy-add de un tester existente o de un invitado recién creado).
drop policy evento_participante_insert on evento_participante;
create policy evento_participante_insert on evento_participante for insert
  to authenticated with check (
    participante_id = auth.uid() or is_participant(evento_id)
  );

-- 4. perfil: cualquier autenticado puede crear una fila de invitado (sin cuenta),
--    pero nunca una fila "de usuario real" por esta vía — esas solo nacen del
--    trigger handle_new_user() en auth.users.
create policy perfil_insert_invitado on perfil for insert
  to authenticated with check (es_invitado = true);

grant insert on perfil to authenticated;
```

- [ ] **Step 2: Aplicar la migración al proyecto real**

Desde la raíz del repo (revisar `Notes.md` para los valores reales de las 3 env vars):

```bash
GOOGLE_CLIENT_ID="<ver Notes.md>" GOOGLE_CLIENT_SECRET="<ver Notes.md>" SUPABASE_ACCESS_TOKEN="<ver Notes.md>" npx supabase db push
```

Expected: prompt listando `0008_invitados.sql`, responder `Y`, termina con `Finished supabase db push.` sin errores.

- [ ] **Step 3: Verificar la columna, el FK y las policies**

```bash
cat > /tmp/verify_0008.json <<'EOF'
{"query":"select column_name, column_default from information_schema.columns where table_name='perfil' and column_name in ('id','es_invitado'); select conname from pg_constraint where conrelid='public.perfil'::regclass and contype='f'; select policyname, cmd, with_check from pg_policies where tablename in ('evento','evento_participante','perfil') and policyname in ('evento_select','evento_participante_insert','perfil_insert_invitado');"}
EOF
curl -s -X POST "https://api.supabase.com/v1/projects/paefmmctrnxkyxdmhjap/database/query" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN, ver Notes.md>" \
  -H "Content-Type: application/json" \
  --data @/tmp/verify_0008.json
```

Expected: `es_invitado` con default `false`, `id` con default conteniendo `gen_random_uuid()`, **cero filas** en el segundo select (sin FK a auth.users), y las 3 policies listadas con el `with_check` esperado.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_invitados.sql
git commit -m "Add es_invitado flag and confirm-to-join RLS policies"
```

---

### Task 2: Tipo `Perfil`

**Files:**
- Modify: `web/src/types/index.ts:3-8`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `Perfil.es_invitado: boolean`, usado por todos los componentes/servicios de las tasks siguientes.

- [ ] **Step 1: Agregar el campo**

En `web/src/types/index.ts`, reemplazar:

```typescript
export interface Perfil {
  id: string;
  nombre: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

por:

```typescript
export interface Perfil {
  id: string;
  nombre: string | null;
  avatar_url: string | null;
  created_at: string;
  es_invitado: boolean;
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd web && npm run build
```

Expected: build limpio (el campo es opcional en la práctica porque Supabase siempre lo va a traer con `select('*')`, pero TypeScript no debería quejarse en ningún call-site existente ya que nadie construye un `Perfil` a mano en el código actual).

- [ ] **Step 3: Commit**

```bash
git add web/src/types/index.ts
git commit -m "Add es_invitado to the Perfil type"
```

---

### Task 3: Funciones nuevas en `eventoService.ts`

**Files:**
- Modify: `web/src/lib/eventoService.ts`

**Interfaces:**
- Consumes: `supabase` client de `./supabase`, tipos `Evento`, `Perfil` de `../types`.
- Produces:
  - `obtenerEventoPreview(eventoId: string): Promise<Pick<Evento, 'id' | 'nombre' | 'fecha'>>`
  - `listarTestersDisponibles(eventoId: string): Promise<Perfil[]>`
  - `agregarParticipanteExistente(eventoId: string, participanteId: string): Promise<void>`
  - `agregarInvitado(eventoId: string, nombre: string): Promise<Perfil>`

- [ ] **Step 1: Agregar `obtenerEventoPreview`**

Insertar después de `obtenerEvento` (línea 39 de `web/src/lib/eventoService.ts`):

```typescript
/** Preview mínimo de un evento para la pantalla de "confirmar asistencia" — se
 * puede leer aunque todavía no seas participante (RLS de evento_select). */
export async function obtenerEventoPreview(
  eventoId: string,
): Promise<Pick<Evento, 'id' | 'nombre' | 'fecha'>> {
  const { data, error } = await supabase
    .from('evento')
    .select('id, nombre, fecha')
    .eq('id', eventoId)
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Agregar `listarTestersDisponibles`, `agregarParticipanteExistente` y `agregarInvitado`**

Insertar después de `listarParticipantes` (línea 57 de `web/src/lib/eventoService.ts`, justo antes de `asignarAsadorTitular`):

```typescript
/** Testers ya registrados (con cuenta real) que todavía no están en este evento —
 * para el buscador de "+ Agregar gente". */
export async function listarTestersDisponibles(eventoId: string): Promise<Perfil[]> {
  const [{ data: todos, error: todosError }, yaEnEvento] = await Promise.all([
    supabase.from('perfil').select('*').eq('es_invitado', false),
    listarParticipantes(eventoId),
  ]);
  if (todosError) throw todosError;

  const idsEnEvento = new Set(yaEnEvento.map((p) => p.id));
  return (todos ?? []).filter((p) => !idsEnEvento.has(p.id));
}

/** Suma a un tester ya registrado (proxy-add) — queda confirmado al toque, sin
 * que esa persona tenga que hacer nada. Requiere que quien llama ya sea
 * participante del evento (lo garantiza la RLS de evento_participante_insert). */
export async function agregarParticipanteExistente(
  eventoId: string,
  participanteId: string,
): Promise<void> {
  const { error } = await supabase
    .from('evento_participante')
    .upsert(
      { evento_id: eventoId, participante_id: participanteId },
      { onConflict: 'evento_id,participante_id' },
    );
  if (error) throw error;
}

/** Carga un invitado externo sin cuenta (solo nombre) y lo suma al evento. */
export async function agregarInvitado(eventoId: string, nombre: string): Promise<Perfil> {
  const { data: perfil, error: perfilError } = await supabase
    .from('perfil')
    .insert({ nombre, es_invitado: true })
    .select()
    .single();
  if (perfilError) throw perfilError;

  const { error: participanteError } = await supabase
    .from('evento_participante')
    .insert({ evento_id: eventoId, participante_id: perfil.id });
  if (participanteError) throw participanteError;

  return perfil as Perfil;
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd web && npm run build
```

Expected: build limpio.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/eventoService.ts
git commit -m "Add eventoService functions for proxy-adding participants"
```

---

### Task 4: Función pura de asistencia + test

**Files:**
- Create: `web/src/lib/asistencia.ts`
- Create: `web/tests/unit/asistencia.test.ts`
- Modify: `web/src/lib/statsService.ts:63-95`

**Interfaces:**
- Consumes: tipo `Perfil` de `../types`.
- Produces: `calcularAsistencia(filas: { perfil: Perfil }[], totalEventos: number): AsistenciaParticipante[]` (misma forma de `AsistenciaParticipante` que ya exporta `statsService.ts`).

- [ ] **Step 1: Escribir el test que falla**

Crear `web/tests/unit/asistencia.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calcularAsistencia } from '../../src/lib/asistencia';
import type { Perfil } from '../../src/types';

function perfil(id: string, esInvitado = false): Perfil {
  return { id, nombre: id, avatar_url: null, created_at: '', es_invitado: esInvitado };
}

describe('calcularAsistencia', () => {
  it('calcula el porcentaje sobre el total de eventos del grupo', () => {
    const filas = [
      { perfil: perfil('juani') },
      { perfil: perfil('juani') },
      { perfil: perfil('pedro') },
    ];
    const resultado = calcularAsistencia(filas, 4);

    expect(resultado).toEqual(
      expect.arrayContaining([
        { participante: perfil('juani'), porcentaje: 50 },
        { participante: perfil('pedro'), porcentaje: 25 },
      ]),
    );
  });

  it('excluye a los invitados sin cuenta del cálculo', () => {
    const filas = [
      { perfil: perfil('juani') },
      { perfil: perfil('juli-arocena-invitada', true) },
    ];
    const resultado = calcularAsistencia(filas, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].participante.id).toBe('juani');
  });

  it('devuelve lista vacía si no hay eventos', () => {
    expect(calcularAsistencia([], 0)).toEqual([]);
  });

  it('ordena de mayor a menor porcentaje', () => {
    const filas = [
      { perfil: perfil('bajo') },
      { perfil: perfil('alto') },
      { perfil: perfil('alto') },
    ];
    const resultado = calcularAsistencia(filas, 2);
    expect(resultado.map((r) => r.participante.id)).toEqual(['alto', 'bajo']);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd web && npm run test -- asistencia
```

Expected: FAIL — `Cannot find module '../../src/lib/asistencia'` (el archivo todavía no existe).

- [ ] **Step 3: Implementar `calcularAsistencia`**

Crear `web/src/lib/asistencia.ts`:

```typescript
import type { Perfil } from '../types';

export interface AsistenciaParticipante {
  participante: Perfil;
  porcentaje: number;
}

/** % de asistencia por usuario: asados asistidos / asados totales del grupo
 * (FR-023). Los invitados sin cuenta (es_invitado) quedan afuera del cálculo. */
export function calcularAsistencia(
  filas: { perfil: Perfil | null }[],
  totalEventos: number,
): AsistenciaParticipante[] {
  if (totalEventos === 0) return [];

  const conteos = new Map<string, { perfil: Perfil; count: number }>();
  for (const { perfil } of filas) {
    if (!perfil || perfil.es_invitado) continue;
    const entry = conteos.get(perfil.id) ?? { perfil, count: 0 };
    entry.count += 1;
    conteos.set(perfil.id, entry);
  }

  return Array.from(conteos.values())
    .map(({ perfil, count }) => ({
      participante: perfil,
      porcentaje: (count / totalEventos) * 100,
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
cd web && npm run test -- asistencia
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Usar la función pura desde `statsService.ts`**

En `web/src/lib/statsService.ts`, reemplazar el bloque completo de `obtenerAsistencia` (líneas 63-95, incluida la interfaz `AsistenciaParticipante` que ahora vive en `asistencia.ts`):

```typescript
export { calcularAsistencia } from './asistencia';
export type { AsistenciaParticipante } from './asistencia';
import { calcularAsistencia } from './asistencia';

/** % de asistencia por usuario (FR-023) — trae los datos crudos de Supabase y
 * delega el cálculo a calcularAsistencia (testeada en asistencia.test.ts). */
export async function obtenerAsistencia() {
  const { data: eventos, error: eventosError } = await supabase.from('evento').select('id');
  if (eventosError) throw eventosError;

  const { data, error } = await supabase
    .from('evento_participante')
    .select('participante_id, perfil(*)');
  if (error) throw error;

  return calcularAsistencia(
    (data ?? []) as unknown as { perfil: Perfil | null }[],
    eventos?.length ?? 0,
  );
}
```

- [ ] **Step 6: Correr todos los tests y el build**

```bash
cd web && npm run test && npm run build
```

Expected: todos los tests pasan (los 4 nuevos + los 10 existentes = 14), build limpio. Si TypeScript se queja de la doble declaración de `import`/`export` en el mismo bloque, reordenar dejando el `import` primero y los dos `export ... from` después — el resultado final debe exponer `calcularAsistencia` y `AsistenciaParticipante` desde `statsService.ts` igual que antes (no romper los imports existentes en `EstadisticasGrupo.tsx`).

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/asistencia.ts web/tests/unit/asistencia.test.ts web/src/lib/statsService.ts
git commit -m "Extract calcularAsistencia as a pure, tested function excluding guests"
```

---

### Task 5: Rediseñar `UnirseEvento.tsx` (preview + confirmar)

**Files:**
- Modify: `web/src/pages/UnirseEvento.tsx`

**Interfaces:**
- Consumes: `obtenerEventoPreview`, `unirseAEvento` de `../lib/eventoService`.
- Produces: mismo componente exportado `UnirseEvento` (sin cambiar la ruta en `App.tsx`).

- [ ] **Step 1: Reescribir el componente**

Reemplazar todo el contenido de `web/src/pages/UnirseEvento.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { obtenerEventoPreview, unirseAEvento } from '../lib/eventoService';

export function UnirseEvento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ nombre: string; fecha: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obtenerEventoPreview(id)
      .then(setPreview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudo cargar el evento.'),
      );
  }, [id]);

  async function confirmar() {
    if (!id) return;
    setConfirmando(true);
    try {
      await unirseAEvento(id);
      navigate(`/eventos/${id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la asistencia.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-lg px-container-padding text-center">
      {error && <p className="text-error">{error}</p>}
      {!error && !preview && <p className="text-on-surface-variant">Cargando...</p>}
      {!error && preview && (
        <>
          <p className="text-lg text-on-surface">
            ¿Confirmás tu asistencia a{' '}
            <span className="font-display font-bold text-primary">{preview.nombre}</span> el{' '}
            {new Date(preview.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            ?
          </p>
          <button
            onClick={confirmar}
            disabled={confirmando}
            className="w-full max-w-[280px] rounded-full bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-sm disabled:opacity-60"
          >
            {confirmando ? 'Confirmando...' : 'Sí, voy'}
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="text-sm font-semibold text-on-surface-variant underline"
          >
            Ahora no
          </button>
        </>
      )}
    </div>
  );
}
```

Nota: si el usuario ya es participante (re-visita el link), `unirseAEvento` sigue siendo un `upsert` con `onConflict` — no rompe nada, simplemente confirma de nuevo sin error, y navega igual al detalle.

- [ ] **Step 2: Verificar que compila**

```bash
cd web && npm run build
```

Expected: build limpio.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/UnirseEvento.tsx
git commit -m "Replace silent auto-join with an explicit confirm-attendance screen"
```

---

### Task 6: Componente `ParticipantesSection`

**Files:**
- Create: `web/src/components/ParticipantesSection.tsx`

**Interfaces:**
- Consumes: `listarTestersDisponibles`, `agregarParticipanteExistente`, `agregarInvitado` de `../lib/eventoService`; tipo `Perfil` de `../types`.
- Produces: componente `ParticipantesSection` con props `{ eventoId: string; participantes: Perfil[]; abierto: boolean; onCambio: () => void }`.

- [ ] **Step 1: Crear el componente**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Perfil } from '../types';
import { agregarInvitado, agregarParticipanteExistente, listarTestersDisponibles } from '../lib/eventoService';

interface Props {
  eventoId: string;
  participantes: Perfil[];
  abierto: boolean;
  onCambio: () => void;
}

export function ParticipantesSection({ eventoId, participantes, abierto, onCambio }: Props) {
  const [agregando, setAgregando] = useState(false);
  const [testers, setTesters] = useState<Perfil[]>([]);
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agregando) return;
    listarTestersDisponibles(eventoId).then(setTesters);
  }, [agregando, eventoId]);

  useEffect(() => {
    if (!agregando) return;
    function handleClickFuera(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAgregando(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [agregando]);

  async function handleAgregarTester(participanteId: string) {
    setError(null);
    try {
      await agregarParticipanteExistente(eventoId, participanteId);
      setTesters((prev) => prev.filter((t) => t.id !== participanteId));
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
  }

  async function handleAgregarInvitado() {
    if (!nombreInvitado.trim()) return;
    setError(null);
    setGuardando(true);
    try {
      await agregarInvitado(eventoId, nombreInvitado.trim());
      setNombreInvitado('');
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el invitado.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-on-surface">Participantes</h2>
        {abierto && (
          <button
            type="button"
            onClick={() => setAgregando((v) => !v)}
            className="text-sm font-semibold text-primary"
          >
            {agregando ? 'Listo' : '+ Agregar gente'}
          </button>
        )}
      </div>

      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {participantes.map((p) => (
          <div key={p.id} className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-lg font-bold text-on-surface-variant">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.nombre ?? ''}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (p.nombre?.[0] ?? '?')
              )}
            </div>
            <span className="max-w-[64px] truncate text-xs text-on-surface-variant">
              {p.nombre ?? 'Sin nombre'}
            </span>
            {p.es_invitado && <span className="text-[10px] text-on-surface-variant">Invitado</span>}
          </div>
        ))}
      </div>

      {agregando && (
        <div
          ref={panelRef}
          className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-white p-3"
        >
          {testers.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-on-surface-variant">Testers ya registrados</p>
              {testers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAgregarTester(t.id)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-on-surface"
                >
                  {t.nombre ?? 'Sin nombre'}
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-on-surface-variant">Invitado externo</p>
            <div className="flex gap-2">
              <input
                value={nombreInvitado}
                onChange={(e) => setNombreInvitado(e.target.value)}
                placeholder="Nombre del invitado"
                className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAgregarInvitado}
                disabled={guardando}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
              >
                + Agregar
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd web && npm run build
```

Expected: build limpio.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ParticipantesSection.tsx
git commit -m "Add ParticipantesSection component for proxy-adding attendees"
```

---

### Task 7: Integrar en `EventoDetalle.tsx` + guard de no-participante

**Files:**
- Modify: `web/src/pages/EventoDetalle.tsx`

**Interfaces:**
- Consumes: `ParticipantesSection` de `../components/ParticipantesSection`, `useAuth` de `../lib/useAuth`, `useNavigate` de `react-router-dom`.

- [ ] **Step 1: Agregar el guard de no-participante**

Como `evento_select` ahora es legible por cualquier autenticado (Task 1), alguien que entra a `/eventos/:id` sin haber confirmado todavía vería el evento "vacío" (sin participantes/gastos, por RLS). Hay que mandarlo a la pantalla de confirmar en cambio.

En `web/src/pages/EventoDetalle.tsx`, cambiar los imports (líneas 1-18):

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AsadorTitularSelect } from '../components/AsadorTitularSelect';
import { FotosEvento } from '../components/FotosEvento';
import { FormGasto } from '../components/FormGasto';
import { GastoItem } from '../components/GastoItem';
import { ParticipantesSection } from '../components/ParticipantesSection';
import { Balances } from './Balances';
import { Settlements } from './Settlements';
import { EstadisticasEvento } from './EstadisticasEvento';
import {
  cerrarEvento,
  invitacionUrl,
  listarParticipantes,
  obtenerEvento,
} from '../lib/eventoService';
import { listarGastos } from '../lib/gastoService';
import { useAuth } from '../lib/useAuth';
import type { Evento, Gasto, Perfil } from '../types';
```

- [ ] **Step 2: Agregar el chequeo de membresía en `cargar()`**

Reemplazar el cuerpo del componente hasta el final de `cargar` (líneas 22-44 actuales):

```tsx
export function EventoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [participantes, setParticipantes] = useState<Perfil[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [tab, setTab] = useState<Tab>('gastos');
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    const [ev, parts, gs] = await Promise.all([
      obtenerEvento(id),
      listarParticipantes(id),
      listarGastos(id),
    ]);
    if (user && !parts.some((p) => p.id === user.id)) {
      navigate(`/eventos/${id}/unirse`, { replace: true });
      return;
    }
    setEvento(ev);
    setParticipantes(parts);
    setGastos(gs as Gasto[]);
  }, [id, user, navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);
```

- [ ] **Step 3: Renderizar `ParticipantesSection`**

En el JSX, reemplazar el bloque de `AsadorTitularSelect` (líneas 98-105 actuales):

```tsx
      <div className="mb-lg flex flex-col gap-lg">
        <FotosEvento eventoId={id} />
        <ParticipantesSection
          eventoId={id}
          participantes={participantes}
          abierto={abierto}
          onCambio={cargar}
        />
        <AsadorTitularSelect
          eventoId={id}
          participantes={participantes}
          asadorTitularId={evento.asador_titular_id}
        />
      </div>
```

- [ ] **Step 4: Verificar que compila**

```bash
cd web && npm run build
```

Expected: build limpio.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/EventoDetalle.tsx
git commit -m "Integrate ParticipantesSection and redirect non-members to confirm screen"
```

---

### Task 8: Validación manual end-to-end

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Correr toda la suite y el build una vez más**

```bash
cd web && npm run test && npm run build && npx oxlint
```

Expected: todos los tests OK, build limpio, sin warnings de lint.

- [ ] **Step 2: Deploy a una preview**

```bash
npx wrangler pages deploy dist --project-name asadarg --branch preview-confirmacion
```

Expected: imprime una URL `https://preview-confirmacion.asadarg.pages.dev`.

- [ ] **Step 3: Probar el flujo a mano contra la preview**

1. Crear un evento nuevo con el usuario logueado (queda adentro automático, sin pantalla de confirmar).
2. Copiar el link de invitación (`Invitar`) y abrirlo con otra cuenta de Google ya registrada (o simular navegando directo a `/eventos/:id/unirse` con otra sesión) — debe ver "¿Confirmás tu asistencia a...?" con nombre y fecha correctos, no debe sumarse solo.
3. Tocar "Sí, voy" — debe aparecer en la sección "Participantes" del evento.
4. Desde el usuario original (ya participante), tocar "+ Agregar gente" — debe listar testers que todavía no están en el evento, y sumar uno con un toque (sin que esa persona haga nada).
5. Cargar un invitado externo por nombre — debe aparecer en "Participantes" con la etiqueta "Invitado", y estar disponible como pagador/en la división al cargar un gasto (`FormGasto`).
6. Ir a Estadísticas del grupo → Asistencia — el invitado externo NO debe aparecer en el listado de asistencia; los testers reales sí.
7. Navegar directo a `/eventos/:id` de un evento del que NO se es participante (con una tercera cuenta, sin pasar por el link) — debe redirigir solo a la pantalla de confirmar, no mostrar el detalle vacío.

- [ ] **Step 4: Reportar resultado**

Si todo lo anterior funciona, avisar al usuario que está listo para revisar y decidir si se pushea a producción (no hacerlo sin que lo pida).
