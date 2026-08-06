import { useEffect, useState } from 'react';
import type { Perfil } from '../types';
import type { Balance } from '../lib/settlements';
import { calcularSettlements } from '../lib/settlements';
import { calcularBalancesEvento } from '../lib/gastoService';

const formatoArs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function Balances({
  eventoId,
  participantes,
}: {
  eventoId: string;
  participantes: Perfil[];
}) {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calcularBalancesEvento(
      eventoId,
      participantes.map((p) => p.id),
    )
      .then(setBalances)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudo calcular el balance.'),
      );
  }, [eventoId, participantes]);

  if (error) {
    return <p className="text-error">{error}</p>;
  }

  if (!balances) {
    return <p className="text-on-surface-variant">Calculando...</p>;
  }

  const perfilesPorId = new Map(participantes.map((p) => [p.id, p]));
  const transferencias = calcularSettlements(balances);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm rounded-2xl bg-white p-4 shadow-sm">
        {balances.map((b) => {
          const nombre = perfilesPorId.get(b.participanteId)?.nombre ?? 'Sin nombre';
          const aFavor = b.balance >= 0;
          return (
            <div key={b.participanteId} className="flex items-center justify-between">
              <span className="font-semibold text-on-surface">{nombre}</span>
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                  aFavor
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {aFavor ? 'A favor' : 'Debe'} {aFavor ? '+' : '-'}$
                {formatoArs.format(Math.abs(b.balance))}
              </span>
            </div>
          );
        })}
      </div>

      {transferencias.length > 0 && (
        <div className="flex flex-col gap-sm">
          <h3 className="pl-2 text-sm font-semibold text-on-surface-variant">Quién le paga a quién</h3>
          {transferencias.map((t) => {
            const de = perfilesPorId.get(t.de)?.nombre ?? 'Alguien';
            const a = perfilesPorId.get(t.a)?.nombre ?? 'alguien';
            return (
              <div
                key={`${t.de}-${t.a}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <span className="material-symbols-outlined rounded-full bg-surface-container-high p-2 text-on-surface-variant">
                  payments
                </span>
                <div className="flex-1">
                  <p className="text-on-surface">
                    <strong>{de}</strong> le debe a <strong>{a}</strong>
                  </p>
                  <p className="font-display font-bold text-primary">
                    ${formatoArs.format(t.monto)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
