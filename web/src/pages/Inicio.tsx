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

  useEffect(() => {
    if (!user) return;
    supabase
      .from('perfil')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setPerfil(data));
    listarMisEventos().then((data) => setEventos(data.slice(0, 3)));
    obtenerStatsHistoricas().then(setStats);
  }, [user]);

  return (
    <Layout title="Asadarg">
      <p className="mb-lg font-display text-2xl font-bold text-on-surface">
        ¡Hola, {perfil?.nombre?.split(' ')[0] ?? 'che'}! 🔥
        <br />
        <span className="text-base font-normal text-on-surface-variant">
          Prepará el fuego, que el finde promete.
        </span>
      </p>

      <div className="mb-lg grid grid-cols-3 gap-2">
        <StatTile icon="set_meal" label="Carne Total" valor={`${stats?.kgTotales ?? 0} kg`} />
        <StatTile
          icon="payments"
          label="Gastados"
          valor={`$${formatoArs.format(stats?.gastoTotalArs ?? 0)}`}
        />
        <StatTile icon="outdoor_grill" label="Asados" valor={String(stats?.cantidadAsados ?? 0)} />
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
        className="fixed bottom-24 left-1/2 flex w-[calc(100%-40px)] max-w-[440px] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)]"
      >
        <span className="material-symbols-outlined icon-fill">add</span>
        Nuevo Asado
      </Link>
    </Layout>
  );
}

function StatTile({ icon, label, valor }: { icon: string; label: string; valor: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <p className="font-display text-sm font-bold text-on-surface">{valor}</p>
      <p className="text-[10px] text-on-surface-variant">{label}</p>
    </div>
  );
}

export function EventoCard({ evento }: { evento: Evento }) {
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
      <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </Link>
  );
}
