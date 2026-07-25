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
