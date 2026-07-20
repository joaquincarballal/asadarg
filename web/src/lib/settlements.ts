export interface Balance {
  participanteId: string;
  /** Positivo = le deben (a favor); negativo = debe. */
  balance: number;
}

export interface Transferencia {
  de: string;
  a: string;
  monto: number;
}

const EPSILON = 0.01;

/**
 * Algoritmo greedy de minimización de transferencias (research.md §5): empareja
 * repetidamente al mayor acreedor con el mayor deudor hasta saldar todos los balances.
 * Mismo enfoque que la función SQL `cerrar_evento` — ver
 * supabase/migrations/0003_cerrar_evento_rpc.sql.
 */
export function calcularSettlements(balances: Balance[]): Transferencia[] {
  const saldos = balances.map((b) => ({ ...b }));
  const transferencias: Transferencia[] = [];

  for (let i = 0; i < saldos.length; i++) {
    const max = saldos.reduce((a, b) => (b.balance > a.balance ? b : a), saldos[0]);
    const min = saldos.reduce((a, b) => (b.balance < a.balance ? b : a), saldos[0]);

    if (max.balance < EPSILON || min.balance > -EPSILON || max === min) break;

    const monto = Math.round(Math.min(max.balance, -min.balance) * 100) / 100;
    transferencias.push({ de: min.participanteId, a: max.participanteId, monto });

    max.balance -= monto;
    min.balance += monto;
  }

  return transferencias;
}
