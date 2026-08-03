import { useState } from 'react';
import type { Gasto, Perfil } from '../types';
import { actualizarGasto, eliminarGasto } from '../lib/gastoService';

const formatoArs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

interface Props {
  gasto: Gasto;
  perfiles: Map<string, Perfil>;
  eventoAbierto: boolean;
  onCambio?: () => void;
}

export function GastoItem({ gasto, perfiles, eventoAbierto, onCambio }: Props) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(gasto.monto_ars));
  const [kilos, setKilos] = useState(String(gasto.kilogramos ?? ''));
  const [guardando, setGuardando] = useState(false);

  const pagador = perfiles.get(gasto.pagador_id);
  const icono = gasto.categoria === 'carne' ? 'restaurant_menu' : 'shopping_basket';
  const titulo =
    gasto.categoria === 'carne'
      ? `${gasto.kilogramos ?? '?'}kg de ${gasto.corte_carne?.nombre ?? 'carne'}`
      : (gasto.concepto ?? 'Extra');

  async function guardar() {
    setGuardando(true);
    try {
      await actualizarGasto(gasto.id, {
        montoArs: Number(monto),
        kilogramos: gasto.categoria === 'carne' ? Number(kilos) : null,
      });
      setEditando(false);
      onCambio?.();
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    await eliminarGasto(gasto.id);
    onCambio?.();
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        {gasto.categoria === 'carne' && (
          <div className="flex flex-col gap-1">
            <label className="pl-2 text-xs font-semibold text-on-surface-variant">
              Cantidad (kg)
            </label>
            <input
              type="number"
              value={kilos}
              onChange={(e) => setKilos(e.target.value)}
              placeholder="Kilos"
              className="rounded-xl border border-outline-variant px-3 py-2"
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="pl-2 text-xs font-semibold text-on-surface-variant">
            Precio total ($)
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto ARS"
            className="rounded-xl border border-outline-variant px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-on-primary"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="flex-1 rounded-full border border-outline-variant py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <span className="material-symbols-outlined text-primary">{icono}</span>
      <div className="flex-1">
        <p className="font-semibold text-on-surface">{titulo}</p>
        <p className="text-xs text-on-surface-variant">Pagó {pagador?.nombre ?? '...'}</p>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-on-surface">
          ${formatoArs.format(gasto.monto_ars)}
        </p>
        {gasto.monto_usd ? (
          <p className="text-xs text-on-surface-variant">
            u$s {formatoArs.format(gasto.monto_usd)}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">USD no disp.</p>
        )}
      </div>
      {eventoAbierto && (
        <div className="flex flex-col gap-1">
          <button onClick={() => setEditando(true)} className="text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={borrar} className="text-error">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
