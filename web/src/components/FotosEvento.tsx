import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { comprimirFoto } from '../lib/imageCompression';
import type { FotoEvento } from '../types';

export function FotosEvento({ eventoId }: { eventoId: string }) {
  const [fotos, setFotos] = useState<FotoEvento[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarFotos = useCallback(async () => {
    const { data } = await supabase
      .from('foto_evento')
      .select('*')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });
    setFotos((data ?? []) as FotoEvento[]);
  }, [eventoId]);

  useEffect(() => {
    cargarFotos();
  }, [cargarFotos]);

  async function urlDeFoto(path: string): Promise<string> {
    const { data } = await supabase.storage.from('fotos-eventos').createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  }

  async function subirFoto(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('No hay sesión activa.');

      const comprimida = await comprimirFoto(file);
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${eventoId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-eventos')
        .upload(path, comprimida);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('foto_evento')
        .insert({ evento_id: eventoId, storage_path: path, subida_por: userId });
      if (insertError) throw insertError;

      await cargarFotos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {fotos.map((foto) => (
          <FotoThumbnail key={foto.id} path={foto.storage_path} obtenerUrl={urlDeFoto} />
        ))}
        <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant">
          <span className="material-symbols-outlined">add_a_photo</span>
          <span className="text-[10px]">{subiendo ? 'Subiendo...' : 'Subir foto'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subirFoto(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

function FotoThumbnail({
  path,
  obtenerUrl,
}: {
  path: string;
  obtenerUrl: (path: string) => Promise<string>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    obtenerUrl(path).then(setUrl);
  }, [path, obtenerUrl]);

  if (!url) {
    return (
      <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-surface-container-high" />
    );
  }

  return <img src={url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-sm" />;
}
