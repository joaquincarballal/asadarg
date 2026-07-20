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
