import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { listarMisEventos } from '../lib/eventoService';
import { obtenerStatsHistoricas, type StatsHistoricas } from '../lib/statsService';
import type { Evento, Perfil } from '../types';

const formatoArs = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function Inicio() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [stats, setStats] = useState<StatsHistoricas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('perfil')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setPerfil(data));
    listarMisEventos()
      .then((data) => setEventos(data.slice(0, 3)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus asados.'),
      );
    obtenerStatsHistoricas()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas.'),
      );
  }, [user]);

  return (
    <Layout title="AsadARG">
      <p className="mb-lg font-display text-2xl font-bold text-on-surface">
        ¡Hola, {perfil?.nombre?.split(' ')[0] ?? 'che'}! 🔥
        <br />
        <span className="text-base font-normal text-on-surface-variant">
          Prepará el fuego, que el finde promete.
        </span>
      </p>

      {error && <p className="mb-lg text-sm text-error">{error}</p>}

      <div className="mb-lg grid grid-cols-3 gap-2">
        <StatTile
          icon="set_meal"
          label="Carne Total"
          valor={`${stats?.kgTotales ?? 0} kg`}
          accent
        />
        <StatTile
          icon="payments"
          label="Gastados"
          valor={`$${formatoArs.format(stats?.gastoTotalArs ?? 0)}`}
        />
        <StatTile
          icon="outdoor_grill"
          label="Asados"
          valor={String(stats?.cantidadAsados ?? 0)}
          accent
        />
      </div>

      <div className="mb-lg flex items-center justify-between">
        <h2 className="font-display font-bold text-on-surface">Tus Últimos Asados</h2>
        <Link to="/asados" className="text-sm font-semibold text-primary">
          Ver todos
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {eventos.map((ev) => (
          <EventoCard key={ev.id} evento={ev} />
        ))}
        {eventos.length === 0 && (
          <p className="text-on-surface-variant">
            Todavía no hay ningún asado cargado. ¡Arrancá uno!
          </p>
        )}
      </div>

      <Link
        to="/eventos/nuevo"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 flex w-[calc(100%-40px)] max-w-[440px] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)]"
      >
        <span className="material-symbols-outlined icon-fill">add</span>
        Nuevo Asado
      </Link>
    </Layout>
  );
}

function StatTile({
  icon,
  label,
  valor,
  accent = false,
}: {
  icon: string;
  label: string;
  valor: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-center shadow-sm ${
        accent ? 'bg-primary-container/25' : 'bg-white'
      }`}
    >
      <span
        className={`material-symbols-outlined ${accent ? 'text-on-primary-container' : 'text-primary'}`}
      >
        {icon}
      </span>
      <p
        className={`font-display text-sm font-bold ${accent ? 'text-on-primary-container' : 'text-on-surface'}`}
      >
        {valor}
      </p>
      <p
        className={`text-[10px] ${accent ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}
      >
        {label}
      </p>
    </div>
  );
}

export function EventoCard({
  evento,
  esParticipante = true,
}: {
  evento: Evento;
  esParticipante?: boolean;
}) {
  return (
    <Link
      to={`/eventos/${evento.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-transform active:scale-[0.98]"
    >
      <span className="material-symbols-outlined text-secondary-container">
        local_fire_department
      </span>
      <div className="flex-1">
        <p className="font-semibold text-on-surface">{evento.nombre}</p>
        <p className="text-xs text-on-surface-variant">
          {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>
      {esParticipante ? (
        <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      ) : (
        <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
          Unirme
        </span>
      )}
    </Link>
  );
}
