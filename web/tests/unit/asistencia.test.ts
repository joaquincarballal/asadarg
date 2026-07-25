import { describe, expect, it } from 'vitest';
import { calcularAsistencia } from '../../src/lib/asistencia';
import type { Perfil } from '../../src/types';

function perfil(id: string, esInvitado = false): Perfil {
  return { id, nombre: id, avatar_url: null, created_at: '', es_invitado: esInvitado };
}

describe('calcularAsistencia', () => {
  it('calcula el porcentaje sobre el total de eventos del grupo', () => {
    const filas = [
      { perfil: perfil('juani') },
      { perfil: perfil('juani') },
      { perfil: perfil('pedro') },
    ];
    const resultado = calcularAsistencia(filas, 4);

    expect(resultado).toEqual(
      expect.arrayContaining([
        { participante: perfil('juani'), porcentaje: 50 },
        { participante: perfil('pedro'), porcentaje: 25 },
      ]),
    );
  });

  it('excluye a los invitados sin cuenta del cálculo', () => {
    const filas = [
      { perfil: perfil('juani') },
      { perfil: perfil('juli-arocena-invitada', true) },
    ];
    const resultado = calcularAsistencia(filas, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].participante.id).toBe('juani');
  });

  it('devuelve lista vacía si no hay eventos', () => {
    expect(calcularAsistencia([], 0)).toEqual([]);
  });

  it('ordena de mayor a menor porcentaje', () => {
    const filas = [
      { perfil: perfil('bajo') },
      { perfil: perfil('alto') },
      { perfil: perfil('alto') },
    ];
    const resultado = calcularAsistencia(filas, 2);
    expect(resultado.map((r) => r.participante.id)).toEqual(['alto', 'bajo']);
  });
});
