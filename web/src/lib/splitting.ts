export interface DivisionParticipante {
  participanteId: string;
  proporcion: number;
}

/**
 * Calcula cómo se divide un gasto entre participantes.
 * Sin `divisionCustom`: equitativo entre todos (FR-015).
 * Con `divisionCustom`: solo entran los ids listados (el resto queda excluido — FR-016),
 * y las proporciones se normalizan para sumar 1 (ver data-model.md).
 */
export function calcularDivision(
  participantesEvento: string[],
  divisionCustom?: DivisionParticipante[],
): DivisionParticipante[] {
  if (!divisionCustom) {
    return dividirEquitativo(participantesEvento);
  }

  if (divisionCustom.length === 0) {
    throw new Error('Un gasto no puede excluir a todos los participantes (FR-017).');
  }

  const idsValidos = new Set(participantesEvento);
  for (const { participanteId } of divisionCustom) {
    if (!idsValidos.has(participanteId)) {
      throw new Error(`${participanteId} no es participante de este evento.`);
    }
  }

  return normalizarProporciones(divisionCustom);
}

function dividirEquitativo(participantes: string[]): DivisionParticipante[] {
  if (participantes.length === 0) {
    throw new Error('Un evento necesita al menos un participante para dividir un gasto.');
  }
  const proporcion = 1 / participantes.length;
  return participantes.map((participanteId) => ({ participanteId, proporcion }));
}

function normalizarProporciones(division: DivisionParticipante[]): DivisionParticipante[] {
  const total = division.reduce((acc, d) => acc + d.proporcion, 0);
  if (total <= 0) {
    throw new Error('Las proporciones deben sumar más que cero.');
  }
  return division.map((d) => ({
    participanteId: d.participanteId,
    proporcion: d.proporcion / total,
  }));
}
