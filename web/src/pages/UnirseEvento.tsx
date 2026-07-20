import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { unirseAEvento } from '../lib/eventoService';

export function UnirseEvento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    unirseAEvento(id)
      .then(() => navigate(`/eventos/${id}`, { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo unir al evento.'));
  }, [id, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-md px-container-padding text-center">
      {error ? (
        <p className="text-error">{error}</p>
      ) : (
        <p className="text-on-surface-variant">Sumándote al asado...</p>
      )}
    </div>
  );
}
