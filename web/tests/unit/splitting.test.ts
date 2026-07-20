import { describe, expect, it } from 'vitest';
import { calcularDivision } from '../../src/lib/splitting';

describe('calcularDivision', () => {
  it('divide equitativamente entre todos los participantes por defecto', () => {
    const resultado = calcularDivision(['a', 'b', 'c']);

    expect(resultado).toHaveLength(3);
    for (const d of resultado) {
      expect(d.proporcion).toBeCloseTo(1 / 3);
    }
  });

  it('excluye participantes cuando se pasa una división custom sin ellos', () => {
    const resultado = calcularDivision(
      ['a', 'b', 'c'],
      [
        { participanteId: 'a', proporcion: 1 },
        { participanteId: 'b', proporcion: 1 },
      ],
    );

    expect(resultado.map((d) => d.participanteId).sort()).toEqual(['a', 'b']);
    for (const d of resultado) {
      expect(d.proporcion).toBeCloseTo(0.5);
    }
  });

  it('normaliza proporciones custom no equitativas para que sumen 1', () => {
    const resultado = calcularDivision(
      ['a', 'b'],
      [
        { participanteId: 'a', proporcion: 2 },
        { participanteId: 'b', proporcion: 1 },
      ],
    );

    const porId = Object.fromEntries(resultado.map((d) => [d.participanteId, d.proporcion]));
    expect(porId.a).toBeCloseTo(2 / 3);
    expect(porId.b).toBeCloseTo(1 / 3);
  });

  it('rechaza una división que excluye a todos los participantes (FR-017)', () => {
    expect(() => calcularDivision(['a', 'b'], [])).toThrow();
  });

  it('rechaza una división con un participante que no pertenece al evento', () => {
    expect(() => calcularDivision(['a', 'b'], [{ participanteId: 'x', proporcion: 1 }])).toThrow();
  });

  it('rechaza dividir un gasto cuando el evento no tiene participantes', () => {
    expect(() => calcularDivision([])).toThrow();
  });
});
