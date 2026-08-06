import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { EventoCard } from './Inicio';
import { listarTodosLosEventos } from '../lib/eventoService';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import type { Evento } from '../types';

export function Asados() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [misEventoIds, setMisEventoIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listarTodosLosEventos()
      .then(setEventos)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los asados.'),
      );
    supabase
      .from('evento_participante')
      .select('evento_id')
      .eq('participante_id', user.id)
      .then(({ data }) => setMisEventoIds(new Set((data ?? []).map((row) => row.evento_id))));
  }, [user]);

  return (
    <Layout title="Asados del Grupo">
      <div className="flex flex-col gap-2">
        {error && <p className="text-error">{error}</p>}
        {!error &&
          eventos.map((ev) => (
            <EventoCard key={ev.id} evento={ev} esParticipante={misEventoIds.has(ev.id)} />
          ))}
        {!error && eventos.length === 0 && (
          <p className="text-on-surface-variant">Todavía no hay ningún asado cargado.</p>
        )}
      </div>
    </Layout>
  );
}
