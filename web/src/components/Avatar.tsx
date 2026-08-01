import type { Perfil } from '../types';

interface Props {
  perfil: Pick<Perfil, 'nombre' | 'avatar_url'>;
  circleClassName?: string;
}

/** Foto de perfil si hay, si no la inicial — mismo criterio en todos lados
 * donde se muestra gente (participantes, pagador, asador titular). */
export function Avatar({ perfil, circleClassName = '' }: Props) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${circleClassName}`}
    >
      {perfil.avatar_url ? (
        <img
          src={perfil.avatar_url}
          alt={perfil.nombre ?? ''}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        (perfil.nombre?.[0] ?? '?')
      )}
    </div>
  );
}
