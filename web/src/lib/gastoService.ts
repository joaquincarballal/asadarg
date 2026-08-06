import { supabase } from './supabase';
import { obtenerCotizacionBlue } from './dolarapi';
import type { CategoriaGasto } from '../types';
import type { DivisionParticipante } from './splitting';
import type { Balance } from './settlements';

export interface CrearGastoInput {
  eventoId: string;
  categoria: CategoriaGasto;
  corteId?: string | null;
  kilogramos?: number | null;
  concepto?: string | null;
  montoArs: number;
  pagadorId: string;
  division: DivisionParticipante[];
  /** true si la división excluye a alguien de los participantes actuales del
   * evento — el gasto queda fijo y deja de autoajustarse cuando se suma gente
   * nueva (ver supabase/migrations/0015_division_dinamica.sql). */
  divisionManual: boolean;
}

/** Guarda un gasto capturando la cotización USD del día (FR-012) y el precio/kg si es
 * carne (FR-013). Si dolarapi.com no responde, el gasto se guarda igual (FR-020).
 * El insert de `gasto` + `gasto_participante` corre atómico en el RPC `crear_gasto`
 * (supabase/migrations/0010_crear_gasto_rpc.sql) — antes eran 2 requests separados y un
 * fallo en el segundo dejaba un gasto sin división, con balances mentirosos. */
export async function crearGasto(input: CrearGastoInput) {
  const { data: userData } = await supabase.auth.getUser();
  const cargadoPorId = userData.user?.id;
  if (!cargadoPorId) throw new Error('No hay sesión activa.');

  const cotizacion = await obtenerCotizacionBlue();
  const cotizacionVenta = cotizacion?.venta ?? null;
  const montoUsd = cotizacionVenta ? input.montoArs / cotizacionVenta : null;
  const precioPorKg =
    input.categoria === 'carne' && input.kilogramos ? input.montoArs / input.kilogramos : null;

  const { data: gasto, error } = await supabase
    .rpc('crear_gasto', {
      p_evento_id: input.eventoId,
      p_categoria: input.categoria,
      p_corte_id: input.corteId ?? null,
      p_kilogramos: input.kilogramos ?? null,
      p_concepto: input.concepto ?? null,
      p_monto_ars: input.montoArs,
      p_cotizacion_usd_venta: cotizacionVenta,
      p_monto_usd: montoUsd,
      p_precio_por_kg: precioPorKg,
      p_pagador_id: input.pagadorId,
      p_cargado_por_id: cargadoPorId,
      p_division: input.division.map((d) => ({
        participanteId: d.participanteId,
        proporcion: d.proporcion,
      })),
      p_division_manual: input.divisionManual,
    })
    .select()
    .single();

  if (error) throw error;
  return gasto;
}

export async function listarGastos(eventoId: string) {
  const { data, error } = await supabase
    .from('gasto')
    .select('*, corte_carne(nombre)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Edita monto y (para carne) kilos de un gasto existente, recalculando precio/kg
 * y el equivalente USD con la cotización ya guardada (FR-007). */
export async function actualizarGasto(
  gastoId: string,
  cambios: { montoArs: number; kilogramos?: number | null },
) {
  const { data: actual, error: fetchError } = await supabase
    .from('gasto')
    .select('cotizacion_usd_venta, categoria')
    .eq('id', gastoId)
    .single();
  if (fetchError) throw fetchError;

  const montoUsd = actual.cotizacion_usd_venta
    ? cambios.montoArs / actual.cotizacion_usd_venta
    : null;
  const precioPorKg =
    actual.categoria === 'carne' && cambios.kilogramos
      ? cambios.montoArs / cambios.kilogramos
      : null;

  const { error } = await supabase
    .from('gasto')
    .update({
      monto_ars: cambios.montoArs,
      monto_usd: montoUsd,
      kilogramos: cambios.kilogramos ?? null,
      precio_por_kg: precioPorKg,
    })
    .eq('id', gastoId);
  if (error) throw error;
}

export async function eliminarGasto(gastoId: string) {
  const { error } = await supabase.from('gasto').delete().eq('id', gastoId);
  if (error) throw error;
}

/** Quiénes están hoy en la división de un gasto puntual (para editarla a mano). */
export async function listarDivisionGasto(gastoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('gasto_participante')
    .select('participante_id')
    .eq('gasto_id', gastoId);
  if (error) throw error;
  return (data ?? []).map((row) => row.participante_id);
}

/** Edita a mano entre quiénes se divide un gasto puntual (ej. sacar a alguien
 * que no tomó vino) sin sacarlo del evento. Deja el gasto fijo: ya no se
 * autoajusta cuando se suma gente nueva (0015_division_dinamica.sql). */
export async function actualizarDivisionGasto(
  gastoId: string,
  participanteIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_division_gasto', {
    p_gasto_id: gastoId,
    p_participante_ids: participanteIds,
  });
  if (error) throw error;
}

export async function listarCortesCarne() {
  const { data, error } = await supabase.from('corte_carne').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function agregarCorteCarne(nombre: string) {
  const { data, error } = await supabase.from('corte_carne').insert({ nombre }).select().single();
  if (error) throw error;
  return data;
}

/** Borra un corte del catálogo compartido. Falla si ya se usó en algún gasto
 * (constraint de FK en `gasto.corte_id`, sin ON DELETE) — se traduce el error acá. */
export async function borrarCorteCarne(id: string) {
  const { error } = await supabase.from('corte_carne').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new Error('Ese corte ya se usó en algún gasto, no se puede borrar.');
    }
    throw error;
  }
}

/** Balance en vivo (pagado - corresponde) por participante — mismo cálculo que usa
 * `cerrar_evento` en SQL (ver supabase/migrations/0003_cerrar_evento_rpc.sql), acá en
 * el cliente para poder mostrarlo antes de cerrar el evento. */
export async function calcularBalancesEvento(
  eventoId: string,
  participanteIds: string[],
): Promise<Balance[]> {
  const { data: gastos, error: gastosError } = await supabase
    .from('gasto')
    .select('id, monto_ars, pagador_id')
    .eq('evento_id', eventoId);
  if (gastosError) throw gastosError;

  const gastoIds = (gastos ?? []).map((g) => g.id);
  const { data: divisiones, error: divisionesError } =
    gastoIds.length > 0
      ? await supabase
          .from('gasto_participante')
          .select('gasto_id, participante_id, proporcion')
          .in('gasto_id', gastoIds)
      : {
          data: [] as { gasto_id: string; participante_id: string; proporcion: number }[],
          error: null,
        };
  if (divisionesError) throw divisionesError;

  const montoPorGasto = new Map((gastos ?? []).map((g) => [g.id, g.monto_ars]));

  const pagadoPorParticipante = new Map<string, number>();
  for (const g of gastos ?? []) {
    pagadoPorParticipante.set(
      g.pagador_id,
      (pagadoPorParticipante.get(g.pagador_id) ?? 0) + g.monto_ars,
    );
  }

  const correspondePorParticipante = new Map<string, number>();
  for (const d of divisiones ?? []) {
    const monto = montoPorGasto.get(d.gasto_id) ?? 0;
    const share = monto * d.proporcion;
    correspondePorParticipante.set(
      d.participante_id,
      (correspondePorParticipante.get(d.participante_id) ?? 0) + share,
    );
  }

  return participanteIds.map((id) => ({
    participanteId: id,
    balance: (pagadoPorParticipante.get(id) ?? 0) - (correspondePorParticipante.get(id) ?? 0),
  }));
}
