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
