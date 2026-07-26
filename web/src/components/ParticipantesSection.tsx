import { useEffect, useRef, useState } from 'react';
import type { Perfil } from '../types';
import { agregarInvitado, agregarParticipanteExistente, listarTestersDisponibles } from '../lib/eventoService';

interface Props {
  eventoId: string;
  participantes: Perfil[];
  abierto: boolean;
  onCambio: () => void;
}

export function ParticipantesSection({ eventoId, participantes, abierto, onCambio }: Props) {
  const [agregando, setAgregando] = useState(false);
  const [testers, setTesters] = useState<Perfil[]>([]);
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!agregando) return;
    listarTestersDisponibles(eventoId)
      .then(setTesters)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la gente que ya usa la app.'));
  }, [agregando, eventoId]);

  useEffect(() => {
    if (!agregando) return;
    function handleClickFuera(e: MouseEvent) {
      const isClickOnPanel = panelRef.current && panelRef.current.contains(e.target as Node);
      const isClickOnButton = buttonRef.current && buttonRef.current.contains(e.target as Node);
      if (!isClickOnPanel && !isClickOnButton) {
        setAgregando(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [agregando]);

  async function handleAgregarTester(participanteId: string) {
    setError(null);
    try {
      await agregarParticipanteExistente(eventoId, participanteId);
      setTesters((prev) => prev.filter((t) => t.id !== participanteId));
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
  }

  async function handleAgregarInvitado() {
    if (!nombreInvitado.trim()) return;
    setError(null);
    setGuardando(true);
    try {
      await agregarInvitado(eventoId, nombreInvitado.trim());
      setNombreInvitado('');
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el invitado.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-on-surface">Participantes</h2>
        {abierto && (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setAgregando((v) => !v)}
            className="text-sm font-semibold text-primary"
          >
            {agregando ? 'Listo' : '+ Agregar gente'}
          </button>
        )}
      </div>

      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {participantes.map((p) => (
          <div key={p.id} className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-lg font-bold text-on-surface-variant">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.nombre ?? ''}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (p.nombre?.[0] ?? '?')
              )}
            </div>
            <span className="max-w-[64px] truncate text-xs text-on-surface-variant">
              {p.nombre ?? 'Sin nombre'}
            </span>
            {p.es_invitado && <span className="text-[10px] text-on-surface-variant">Invitado</span>}
          </div>
        ))}
      </div>

      {agregando && (
        <div
          ref={panelRef}
          className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-white p-3"
        >
          {testers.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-on-surface-variant">Gente que ya usa la app</p>
              {testers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAgregarTester(t.id)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-on-surface"
                >
                  {t.nombre ?? 'Sin nombre'}
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-on-surface-variant">Invitado externo</p>
            <div className="flex gap-2">
              <input
                value={nombreInvitado}
                onChange={(e) => setNombreInvitado(e.target.value)}
                placeholder="Nombre del invitado"
                className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAgregarInvitado}
                disabled={guardando}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
              >
                + Agregar
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
