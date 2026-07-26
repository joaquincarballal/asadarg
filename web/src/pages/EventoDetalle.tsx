import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AsadorTitularSelect } from '../components/AsadorTitularSelect';
import { FotosEvento } from '../components/FotosEvento';
import { FormGasto } from '../components/FormGasto';
import { GastoItem } from '../components/GastoItem';
import { ParticipantesSection } from '../components/ParticipantesSection';
import { Balances } from './Balances';
import { Settlements } from './Settlements';
import { EstadisticasEvento } from './EstadisticasEvento';
import {
  cerrarEvento,
  invitacionUrl,
  listarParticipantes,
  obtenerEvento,
} from '../lib/eventoService';
import { listarGastos } from '../lib/gastoService';
import { useAuth } from '../lib/useAuth';
import type { Evento, Gasto, Perfil } from '../types';

type Tab = 'gastos' | 'balance' | 'stats';

export function EventoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [participantes, setParticipantes] = useState<Perfil[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [tab, setTab] = useState<Tab>('gastos');
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    const [ev, parts, gs] = await Promise.all([
      obtenerEvento(id),
      listarParticipantes(id),
      listarGastos(id),
    ]);
    if (user && !parts.some((p) => p.id === user.id)) {
      navigate(`/eventos/${id}/unirse`, { replace: true });
      return;
    }
    setEvento(ev);
    setParticipantes(parts);
    setGastos(gs as Gasto[]);
  }, [id, user, navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!id || !evento) {
    return (
      <Layout>
        <p className="text-on-surface-variant">Cargando...</p>
      </Layout>
    );
  }

  const abierto = evento.estado === 'abierto';
  const perfilesPorId = new Map(participantes.map((p) => [p.id, p]));
  const gastosCarne = gastos.filter((g) => g.categoria === 'carne');
  const gastosExtras = gastos.filter((g) => g.categoria === 'extra');

  async function copiarInvitacion() {
    await navigator.clipboard.writeText(invitacionUrl(id!));
    alert('¡Link de invitación copiado!');
  }

  async function handleCerrar() {
    if (!confirm('¿Cerrar el evento? Ya no se van a poder cargar ni editar gastos.')) return;
    setCerrando(true);
    try {
      await cerrarEvento(id!);
      await cargar();
      setTab('balance');
    } finally {
      setCerrando(false);
    }
  }

  return (
    <Layout title={evento.nombre}>
      <div className="mb-lg flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        {abierto && (
          <button
            onClick={copiarInvitacion}
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Invitar
          </button>
        )}
      </div>

      <div className="mb-lg flex flex-col gap-lg">
        <FotosEvento eventoId={id} />
        <ParticipantesSection
          eventoId={id}
          participantes={participantes}
          abierto={abierto}
          onCambio={cargar}
        />
        <AsadorTitularSelect
          eventoId={id}
          participantes={participantes}
          asadorTitularId={evento.asador_titular_id}
        />
      </div>

      <div className="mb-lg flex rounded-full bg-surface-container-low p-1">
        {(
          [
            ['gastos', 'Gastos'],
            ['balance', 'Balance'],
            ['stats', 'Stats'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
              tab === value ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'gastos' && (
        <div className="flex flex-col gap-lg">
          {abierto && <FormGasto eventoId={id} participantes={participantes} onCreado={cargar} />}
          {gastosCarne.length > 0 && (
            <div>
              <h3 className="mb-sm flex items-center gap-2 font-display font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary">outdoor_grill</span>
                Carne
              </h3>
              <div className="flex flex-col gap-2">
                {gastosCarne.map((g) => (
                  <GastoItem
                    key={g.id}
                    gasto={g}
                    perfiles={perfilesPorId}
                    eventoAbierto={abierto}
                    onCambio={cargar}
                  />
                ))}
              </div>
            </div>
          )}
          {gastosExtras.length > 0 && (
            <div>
              <h3 className="mb-sm flex items-center gap-2 font-display font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary">shopping_basket</span>
                Extras
              </h3>
              <div className="flex flex-col gap-2">
                {gastosExtras.map((g) => (
                  <GastoItem
                    key={g.id}
                    gasto={g}
                    perfiles={perfilesPorId}
                    eventoAbierto={abierto}
                    onCambio={cargar}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'balance' && (
        <div className="flex flex-col gap-lg">
          {abierto ? (
            <>
              <Balances eventoId={id} participantes={participantes} />
              <button
                onClick={handleCerrar}
                disabled={cerrando}
                className="rounded-full bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-sm disabled:opacity-60"
              >
                {cerrando ? 'Cerrando...' : 'Cerrar evento y saldar cuentas'}
              </button>
            </>
          ) : (
            <Settlements eventoId={id} participantes={participantes} />
          )}
        </div>
      )}

      {tab === 'stats' && (
        <EstadisticasEvento eventoId={id} cantidadParticipantes={participantes.length} />
      )}
    </Layout>
  );
}
