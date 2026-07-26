import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { obtenerEventoPreview, unirseAEvento } from '../lib/eventoService';

export function UnirseEvento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ nombre: string; fecha: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obtenerEventoPreview(id)
      .then(setPreview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudo cargar el evento.'),
      );
  }, [id]);

  async function confirmar() {
    if (!id) return;
    setConfirmando(true);
    try {
      await unirseAEvento(id);
      navigate(`/eventos/${id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la asistencia.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-lg px-container-padding text-center">
      {error && <p className="text-error">{error}</p>}
      {!error && !preview && <p className="text-on-surface-variant">Cargando...</p>}
      {!error && preview && (
        <>
          <p className="text-lg text-on-surface">
            ¿Confirmás tu asistencia a{' '}
            <span className="font-display font-bold text-primary">{preview.nombre}</span> el{' '}
            {new Date(preview.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            ?
          </p>
          <button
            onClick={confirmar}
            disabled={confirmando}
            className="w-full max-w-[280px] rounded-full bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-sm disabled:opacity-60"
          >
            {confirmando ? 'Confirmando...' : 'Sí, voy'}
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="text-sm font-semibold text-on-surface-variant underline"
          >
            Ahora no
          </button>
        </>
      )}
    </div>
  );
}
