import type { PuntoPrecioMensual } from '../lib/statsService';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const WIDTH = 280;
const HEIGHT = 120;
const PADDING = 8;

/** Line chart a mano en SVG — sin librería de charting (research.md §9). */
export function PrecioKgChart({ datos }: { datos: PuntoPrecioMensual[] }) {
  if (datos.length < 2) {
    return (
      <p className="text-sm text-on-surface-variant">
        Todavía no hay suficientes datos para mostrar la tendencia.
      </p>
    );
  }

  const valores = datos.map((d) => d.precioPromedio);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const puntos = datos.map((d, i) => {
    const x = PADDING + (i / (datos.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((d.precioPromedio - min) / rango) * (HEIGHT - PADDING * 2);
    return { x, y, d };
  });

  const path = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${puntos[puntos.length - 1].x},${HEIGHT} L${puntos[0].x},${HEIGHT} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Tendencia de precio por kilo"
      >
        <path d={area} fill="var(--color-primary-container)" opacity={0.2} />
        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {puntos.map((p) => (
          <circle key={p.d.mes} cx={p.x} cy={p.y} r={4} fill="var(--color-primary)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-on-surface-variant">
        {datos.map((d) => (
          <span key={d.mes}>{MESES[Number(d.mes.slice(5, 7)) - 1]}</span>
        ))}
      </div>
    </div>
  );
}
