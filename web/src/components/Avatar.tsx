import type { Perfil } from '../types';

interface Props {
  perfil: Pick<Perfil, 'nombre' | 'avatar_url'>;
  circleClassName?: string;
  /** Marca un check bien visible encima — el anillo de borde solo no se nota
   * sobre fotos (se pierde contra el color de la imagen). */
  activo?: boolean;
}

/** Foto de perfil si hay, si no la inicial — mismo criterio en todos lados
 * donde se muestra gente (participantes, pagador, asador titular). */
export function Avatar({ perfil, circleClassName = '', activo = false }: Props) {
  return (
    <div className="relative">
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
      {activo && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-white">
          <span className="material-symbols-outlined icon-fill text-[14px]">check</span>
        </span>
      )}
    </div>
  );
}
