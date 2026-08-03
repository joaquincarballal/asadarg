import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { EventoCard } from './Inicio';
import { listarMisEventos } from '../lib/eventoService';
import type { Evento } from '../types';

export function Asados() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarMisEventos()
      .then(setEventos)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los asados.'),
      );
  }, []);

  return (
    <Layout title="Tus Asados">
      <div className="flex flex-col gap-2">
        {error && <p className="text-error">{error}</p>}
        {!error &&
          eventos.map((ev) => <EventoCard key={ev.id} evento={ev} />)}
        {!error && eventos.length === 0 && (
          <p className="text-on-surface-variant">Todavía no hay ningún asado cargado.</p>
        )}
      </div>
    </Layout>
  );
}
