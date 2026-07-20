import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { EventoCard } from './Inicio';
import { listarMisEventos } from '../lib/eventoService';
import type { Evento } from '../types';

export function Asados() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    listarMisEventos().then(setEventos);
  }, []);

  return (
    <Layout title="Tus Asados">
      <div className="flex flex-col gap-2">
        {eventos.map((ev) => (
          <EventoCard key={ev.id} evento={ev} />
        ))}
        {eventos.length === 0 && (
          <p className="text-on-surface-variant">Todavía no hay ningún asado cargado.</p>
        )}
      </div>
    </Layout>
  );
}
