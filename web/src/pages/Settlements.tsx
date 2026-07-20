import { useCallback, useEffect, useState } from 'react';
import type { Perfil, Settlement } from '../types';
import { listarSettlements, marcarSettlementPagado } from '../lib/eventoService';

const formatoArs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function Settlements({
  eventoId,
  participantes,
}: {
  eventoId: string;
  participantes: Perfil[];
}) {
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);

  const cargar = useCallback(async () => {
    setSettlements(await listarSettlements(eventoId));
  }, [eventoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function pagar(id: string) {
    await marcarSettlementPagado(id);
    await cargar();
  }

  if (!settlements) return <p className="text-on-surface-variant">Calculando...</p>;

  if (settlements.length === 0) {
    return <p className="text-on-surface-variant">No hace falta que nadie le pague a nadie. 🎉</p>;
  }

  const perfilesPorId = new Map(participantes.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-sm">
      <h3 className="pl-2 text-sm font-semibold text-on-surface-variant">Cómo saldar</h3>
      {settlements.map((s) => {
        const de = perfilesPorId.get(s.de_participante_id)?.nombre ?? 'Alguien';
        const a = perfilesPorId.get(s.a_participante_id)?.nombre ?? 'alguien';
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ${s.pagado ? 'opacity-50' : ''}`}
          >
            <span className="material-symbols-outlined rounded-full bg-surface-container-high p-2 text-on-surface-variant">
              payments
            </span>
            <div className="flex-1">
              <p className="text-on-surface">
                <strong>{de}</strong> le paga a <strong>{a}</strong>
              </p>
              <p className="font-display font-bold text-primary">
                ${formatoArs.format(s.monto_ars)}
              </p>
            </div>
            {s.pagado ? (
              <span className="text-xs font-semibold text-on-surface-variant">PAGADO</span>
            ) : (
              <button
                onClick={() => pagar(s.id)}
                className="rounded-full bg-secondary-container px-4 py-2 text-xs font-bold uppercase tracking-wide text-on-secondary-container"
              >
                Pagar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
