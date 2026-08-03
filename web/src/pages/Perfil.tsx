import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { logout, supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import type { Perfil as PerfilType } from '../types';

export function Perfil() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('perfil')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setPerfil(data as PerfilType | null);
      });
  }, [user]);

  return (
    <Layout title="Perfil">
      <div className="flex flex-col items-center gap-md py-lg text-center">
        {error && <p className="text-error">{error}</p>}
        {perfil?.avatar_url ? (
          <img
            src={perfil.avatar_url}
            alt={perfil.nombre ?? 'Vos'}
            className="h-24 w-24 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high font-display text-3xl text-on-surface-variant">
            {perfil?.nombre?.[0] ?? '?'}
          </div>
        )}
        <h2 className="font-display text-xl font-bold text-on-surface">
          {perfil?.nombre ?? 'Vos'}
        </h2>
        <p className="text-sm text-on-surface-variant">{user?.email}</p>
        <button
          onClick={() => logout()}
          className="mt-lg rounded-full border border-outline-variant px-6 py-3 font-label-md text-sm font-semibold text-primary transition-colors active:bg-surface-container-low"
        >
          Cerrar sesión
        </button>
      </div>
    </Layout>
  );
}
