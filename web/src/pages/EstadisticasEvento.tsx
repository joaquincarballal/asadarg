import { useEffect, useState } from 'react';
import { obtenerStatsEvento, type StatsEvento } from '../lib/statsService';

const formatoArs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function EstadisticasEvento({
  eventoId,
  cantidadParticipantes,
}: {
  eventoId: string;
  cantidadParticipantes: number;
}) {
  const [stats, setStats] = useState<StatsEvento | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerStatsEvento(eventoId, cantidadParticipantes)
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron calcular las stats.'),
      );
  }, [eventoId, cantidadParticipantes]);

  if (error) return <p className="text-error">{error}</p>;
  if (!stats) return <p className="text-on-surface-variant">Calculando...</p>;

  const items = [
    { label: 'Kilos totales', valor: `${stats.kgTotales} kg` },
    { label: 'Gasto total', valor: `$${formatoArs.format(stats.gastoTotalArs)}` },
    { label: 'Gasto per cápita', valor: `$${formatoArs.format(stats.gastoPerCapitaArs)}` },
    {
      label: 'Precio promedio/kg',
      valor: stats.precioPromedioPorKg ? `$${formatoArs.format(stats.precioPromedioPorKg)}` : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-on-surface-variant">{item.label}</p>
          <p className="font-display text-xl font-bold text-on-surface">{item.valor}</p>
        </div>
      ))}
    </div>
  );
}
