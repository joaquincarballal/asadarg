import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { crearEvento } from '../lib/eventoService';

export function CrearEvento() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Poné un nombre para el asado.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const evento = await crearEvento({ nombre: nombre.trim(), fecha });
      navigate(`/eventos/${evento.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout title="Nuevo Asado">
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xs">
          <label className="pl-2 text-sm font-semibold text-on-surface-variant">
            Nombre del evento
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Asado del 25 de Mayo"
            className="rounded-xl border border-outline-variant bg-white px-4 py-3 text-lg text-on-surface shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="pl-2 text-sm font-semibold text-on-surface-variant">
            ¿Cuándo nos juntamos?
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-xl border border-outline-variant bg-white px-4 py-3 text-lg text-on-surface shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="rounded-full bg-secondary-container px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)] transition-transform active:scale-95 disabled:opacity-60"
        >
          {guardando ? 'Prendiendo el fuego...' : '¡Prendé el fuego! 🔥'}
        </button>
      </form>
    </Layout>
  );
}
