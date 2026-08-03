import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { PrecioKgChart } from '../components/PrecioKgChart';
import {
  obtenerAsistencia,
  obtenerRankingAsadores,
  obtenerStatsHistoricas,
  obtenerTendenciaPrecioKg,
  type AsistenciaParticipante,
  type PuntoPrecioMensual,
  type RankingAsador,
  type StatsHistoricas,
} from '../lib/statsService';

const formatoArs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function EstadisticasGrupo() {
  const [stats, setStats] = useState<StatsHistoricas | null>(null);
  const [asistencia, setAsistencia] = useState<AsistenciaParticipante[]>([]);
  const [ranking, setRanking] = useState<RankingAsador[]>([]);
  const [tendencia, setTendencia] = useState<PuntoPrecioMensual[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (err: unknown) =>
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas.');
    obtenerStatsHistoricas().then(setStats).catch(onError);
    obtenerAsistencia().then(setAsistencia).catch(onError);
    obtenerRankingAsadores().then(setRanking).catch(onError);
    obtenerTendenciaPrecioKg().then(setTendencia).catch(onError);
  }, []);

  return (
    <Layout title="Estadísticas del Grupo">
      <p className="mb-lg text-on-surface-variant">Los números no mienten, papá.</p>
      {error && <p className="mb-lg text-sm text-error">{error}</p>}

      <section className="relative mb-lg overflow-hidden rounded-2xl p-5 text-center shadow-sm">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'linear-gradient(to bottom, var(--color-primary-container) 0%, var(--color-primary-container) 33%, var(--color-background) 33%, var(--color-background) 67%, var(--color-primary-container) 67%, var(--color-primary-container) 100%)',
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Total gastado histórico
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-on-surface">
            ${formatoArs.format(stats?.gastoTotalArs ?? 0)} ARS
          </p>
          <p className="mt-1 rounded-full bg-white/60 px-3 py-1 text-sm text-on-surface-variant inline-block">
            (u$s {formatoArs.format(stats?.gastoTotalUsd ?? 0)})
          </p>
          <p className="mt-3 text-xs text-on-surface-variant">
            {stats?.kgTotales ?? 0} kg de carne · {stats?.cantidadAsados ?? 0} asados
          </p>
        </div>
      </section>

      <h2 className="mb-sm font-display text-lg font-bold text-on-surface">Asistencia</h2>
      <div className="hide-scrollbar mb-lg flex gap-4 overflow-x-auto pb-2">
        {asistencia.map((a) => (
          <div key={a.participante.id} className="flex shrink-0 flex-col items-center gap-1">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full p-1"
              style={{
                background: `conic-gradient(var(--color-primary) ${a.porcentaje}%, var(--color-surface-container-high) 0)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-bold text-on-surface">
                {a.participante.avatar_url ? (
                  <img
                    src={a.participante.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (a.participante.nombre?.[0] ?? '?')
                )}
              </div>
            </div>
            <span className="text-xs font-semibold text-on-surface">{a.participante.nombre}</span>
            <span className="text-xs text-on-surface-variant">{Math.round(a.porcentaje)}%</span>
          </div>
        ))}
      </div>

      <section className="mb-lg rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-sm flex items-center gap-2 font-display text-lg font-bold text-on-surface">
          <span className="material-symbols-outlined icon-fill text-secondary-container">
            local_fire_department
          </span>
          El que más prendió el fuego
        </h2>
        <div className="flex flex-col gap-2">
          {ranking.map((r) => (
            <div
              key={r.participante.id}
              className="flex items-center justify-between border-t border-outline-variant/30 py-2 first:border-t-0 first:pt-0"
            >
              <span className="text-on-surface">{r.participante.nombre}</span>
              <span className="rounded-full bg-secondary-container/30 px-3 py-1 text-sm font-bold text-on-secondary-container">
                {r.veces} 🔥
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-on-surface">Precio del kg de asado</h2>
        <p className="mb-sm text-xs text-on-surface-variant">Últimos 6 meses</p>
        <PrecioKgChart datos={tendencia} />
      </section>
    </Layout>
  );
}
