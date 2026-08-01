import { useState } from 'react';
import type { Perfil } from '../types';
import { Avatar } from './Avatar';
import { asignarAsadorTitular } from '../lib/eventoService';
import { primerNombre } from '../lib/perfil';

interface Props {
  eventoId: string;
  participantes: Perfil[];
  asadorTitularId: string | null;
  onChange?: (participanteId: string | null) => void;
}

export function AsadorTitularSelect({ eventoId, participantes, asadorTitularId, onChange }: Props) {
  const [seleccionado, setSeleccionado] = useState(asadorTitularId);
  const [guardando, setGuardando] = useState(false);

  async function seleccionar(participanteId: string | null) {
    setGuardando(true);
    try {
      await asignarAsadorTitular(eventoId, participanteId);
      setSeleccionado(participanteId);
      onChange?.(participanteId);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <label className="pl-2 text-sm font-semibold text-on-surface-variant">
        ¿Quién se pone la 10 en la parrilla?
      </label>
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {participantes.map((p) => {
          const activo = p.id === seleccionado;
          return (
            <button
              key={p.id}
              type="button"
              disabled={guardando}
              onClick={() => seleccionar(activo ? null : p.id)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <Avatar
                perfil={p}
                circleClassName={`border-2 transition-all ${
                  activo
                    ? 'border-secondary-container bg-secondary-container/20 text-on-secondary-container'
                    : 'border-transparent bg-surface-container-high text-on-surface-variant'
                }`}
              />
              <span className="max-w-[64px] truncate text-xs text-on-surface-variant">
                {primerNombre(p.nombre)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
