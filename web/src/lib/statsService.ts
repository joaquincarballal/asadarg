import { supabase } from './supabase';
import type { Perfil } from '../types';
import { calcularAsistencia } from './asistencia';

export interface StatsEvento {
  kgTotales: number;
  gastoTotalArs: number;
  gastoPerCapitaArs: number;
  precioPromedioPorKg: number | null;
}

export async function obtenerStatsEvento(
  eventoId: string,
  cantidadParticipantes: number,
): Promise<StatsEvento> {
  const { data, error } = await supabase
    .from('gasto')
    .select('categoria, monto_ars, kilogramos, precio_por_kg')
    .eq('evento_id', eventoId);
  if (error) throw error;

  const gastos = data ?? [];
  const kgTotales = gastos.reduce((acc, g) => acc + (g.kilogramos ?? 0), 0);
  const gastoTotalArs = gastos.reduce((acc, g) => acc + g.monto_ars, 0);
  const preciosPorKg = gastos
    .filter((g) => g.categoria === 'carne' && g.precio_por_kg)
    .map((g) => g.precio_por_kg as number);
  const precioPromedioPorKg =
    preciosPorKg.length > 0 ? preciosPorKg.reduce((a, b) => a + b, 0) / preciosPorKg.length : null;

  return {
    kgTotales,
    gastoTotalArs,
    gastoPerCapitaArs: cantidadParticipantes > 0 ? gastoTotalArs / cantidadParticipantes : 0,
    precioPromedioPorKg,
  };
}

export interface StatsHistoricas {
  kgTotales: number;
  gastoTotalArs: number;
  gastoTotalUsd: number;
  cantidadAsados: number;
}

/** Contador histórico cross-evento (FR-022). */
export async function obtenerStatsHistoricas(): Promise<StatsHistoricas> {
  const [gastosRes, eventosRes] = await Promise.all([
    supabase.from('gasto').select('monto_ars, monto_usd, kilogramos'),
    supabase.from('evento').select('id, evento_participante!inner()'),
  ]);
  if (gastosRes.error) throw gastosRes.error;
  if (eventosRes.error) throw eventosRes.error;

  const gastos = gastosRes.data ?? [];
  return {
    kgTotales: gastos.reduce((acc, g) => acc + (g.kilogramos ?? 0), 0),
    gastoTotalArs: gastos.reduce((acc, g) => acc + g.monto_ars, 0),
    gastoTotalUsd: gastos.reduce((acc, g) => acc + (g.monto_usd ?? 0), 0),
    cantidadAsados: eventosRes.data?.length ?? 0,
  };
}

export { calcularAsistencia } from './asistencia';
export type { AsistenciaParticipante } from './asistencia';

/** % de asistencia por usuario (FR-023) — trae los datos crudos de Supabase y
 * delega el cálculo a calcularAsistencia (testeada en asistencia.test.ts). */
export async function obtenerAsistencia() {
  const { data: eventos, error: eventosError } = await supabase
    .from('evento')
    .select('id, evento_participante!inner()');
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

export interface RankingAsador {
  participante: Perfil;
  veces: number;
}

/** Ranking de Asadores Titulares — quién ofició más veces (FR-024). */
export async function obtenerRankingAsadores(): Promise<RankingAsador[]> {
  const { data, error } = await supabase
    .from('evento')
    .select('asador_titular_id, perfil:asador_titular_id(*), evento_participante!inner()')
    .not('asador_titular_id', 'is', null);
  if (error) throw error;

  const conteos = new Map<string, { perfil: Perfil; count: number }>();
  for (const row of (data ?? []) as unknown as { perfil: Perfil | null }[]) {
    const p = row.perfil;
    if (!p) continue;
    const entry = conteos.get(p.id) ?? { perfil: p, count: 0 };
    entry.count += 1;
    conteos.set(p.id, entry);
  }

  return Array.from(conteos.values())
    .map(({ perfil, count }) => ({ participante: perfil, veces: count }))
    .sort((a, b) => b.veces - a.veces);
}

export interface PuntoPrecioMensual {
  mes: string; // YYYY-MM
  precioPromedio: number;
}

/** Evolución mensual del precio/kg de carne, últimos 6 meses (FR-025b). */
export async function obtenerTendenciaPrecioKg(): Promise<PuntoPrecioMensual[]> {
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  const { data, error } = await supabase
    .from('gasto')
    .select('precio_por_kg, created_at')
    .eq('categoria', 'carne')
    .not('precio_por_kg', 'is', null)
    .gte('created_at', seisMesesAtras.toISOString());
  if (error) throw error;

  const porMes = new Map<string, number[]>();
  for (const g of data ?? []) {
    const mes = g.created_at.slice(0, 7);
    const arr = porMes.get(mes) ?? [];
    arr.push(g.precio_por_kg as number);
    porMes.set(mes, arr);
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, precios]) => ({
      mes,
      precioPromedio: precios.reduce((a, b) => a + b, 0) / precios.length,
    }));
}
