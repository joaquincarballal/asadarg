import { describe, expect, it } from 'vitest';
import { calcularSettlements } from '../../src/lib/settlements';

describe('calcularSettlements', () => {
  it('resuelve el caso de ejemplo de la pantalla de Saldos (3 personas)', () => {
    const transferencias = calcularSettlements([
      { participanteId: 'juani', balance: 5000 },
      { participanteId: 'pedro', balance: -2000 },
      { participanteId: 'gringo', balance: -3000 },
    ]);

    expect(transferencias).toHaveLength(2);
    expect(transferencias).toEqual(
      expect.arrayContaining([
        { de: 'pedro', a: 'juani', monto: 2000 },
        { de: 'gringo', a: 'juani', monto: 3000 },
      ]),
    );
  });

  it('no genera transferencias si todos los balances están saldados', () => {
    const transferencias = calcularSettlements([
      { participanteId: 'a', balance: 0 },
      { participanteId: 'b', balance: 0 },
    ]);
    expect(transferencias).toHaveLength(0);
  });

  it('resuelve el caso simple de dos personas', () => {
    const transferencias = calcularSettlements([
      { participanteId: 'a', balance: 100 },
      { participanteId: 'b', balance: -100 },
    ]);
    expect(transferencias).toEqual([{ de: 'b', a: 'a', monto: 100 }]);
  });

  it('nunca genera más transferencias que participantes - 1 (SC-004)', () => {
    const balances = [
      { participanteId: 'a', balance: 1000 },
      { participanteId: 'b', balance: 500 },
      { participanteId: 'c', balance: -300 },
      { participanteId: 'd', balance: -600 },
      { participanteId: 'e', balance: -600 },
    ];
    const transferencias = calcularSettlements(balances);
    expect(transferencias.length).toBeLessThanOrEqual(balances.length - 1);

    // Y efectivamente salda todo: el neto que recibe cada uno coincide con su balance.
    const neto = new Map(balances.map((b) => [b.participanteId, 0]));
    for (const t of transferencias) {
      neto.set(t.de, (neto.get(t.de) ?? 0) - t.monto);
      neto.set(t.a, (neto.get(t.a) ?? 0) + t.monto);
    }
    for (const b of balances) {
      expect(neto.get(b.participanteId)).toBeCloseTo(b.balance, 1);
    }
  });
});
