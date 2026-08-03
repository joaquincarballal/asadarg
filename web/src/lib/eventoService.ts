import { supabase } from './supabase';
import type { Evento, Perfil, Settlement } from '../types';

export async function crearEvento(params: { nombre: string; fecha: string }): Promise<Evento> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('No hay sesión activa.');

  const { data, error } = await supabase
    .from('evento')
    .insert({ nombre: params.nombre, fecha: params.fecha, creado_por: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Evento;
}

/** Unión directa vía link de invitación, sin aprobación (FR-004). */
export async function unirseAEvento(eventoId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('No hay sesión activa.');

  const { error } = await supabase
    .from('evento_participante')
    .upsert(
      { evento_id: eventoId, participante_id: userId },
      { onConflict: 'evento_id,participante_id' },
    );

  if (error) throw error;
}

export async function obtenerEvento(eventoId: string): Promise<Evento> {
  const { data, error } = await supabase.from('evento').select('*').eq('id', eventoId).single();
  if (error) throw error;
  return data as Evento;
}

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

export async function listarMisEventos(): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('evento')
    .select('*, evento_participante!inner()')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data as Evento[];
}

export async function listarParticipantes(eventoId: string): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('evento_participante')
    .select('perfil(*)')
    .eq('evento_id', eventoId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => (row as unknown as { perfil: Perfil }).perfil);
}

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

export async function asignarAsadorTitular(eventoId: string, participanteId: string | null) {
  const { error } = await supabase
    .from('evento')
    .update({ asador_titular_id: participanteId })
    .eq('id', eventoId);
  if (error) throw error;
}

export function invitacionUrl(eventoId: string): string {
  return `${window.location.origin}/eventos/${eventoId}/unirse`;
}

/** Cierra el evento y calcula los settlements optimizados de forma atómica
 * (contracts/close-event-rpc.md). Bloquea nuevos gastos (FR-019). */
export async function cerrarEvento(eventoId: string): Promise<Settlement[]> {
  const { data, error } = await supabase.rpc('cerrar_evento', { p_evento_id: eventoId });
  if (error) throw error;
  return (data ?? []) as Settlement[];
}

export async function listarSettlements(eventoId: string): Promise<Settlement[]> {
  const { data, error } = await supabase.from('settlement').select('*').eq('evento_id', eventoId);
  if (error) throw error;
  return (data ?? []) as Settlement[];
}

/** Marca una transferencia como pagada — registro manual, sin procesar pago real (FR-019b). */
export async function marcarSettlementPagado(settlementId: string): Promise<void> {
  const { error } = await supabase
    .from('settlement')
    .update({ pagado: true, pagado_at: new Date().toISOString() })
    .eq('id', settlementId);
  if (error) throw error;
}
