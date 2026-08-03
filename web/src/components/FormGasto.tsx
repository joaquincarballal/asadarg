import { useEffect, useRef, useState } from 'react';
import type { CategoriaGasto, CorteCarne, Perfil } from '../types';
import { Avatar } from './Avatar';
import { calcularDivision } from '../lib/splitting';
import { primerNombre } from '../lib/perfil';
import { agregarCorteCarne, borrarCorteCarne, crearGasto, listarCortesCarne } from '../lib/gastoService';

interface Props {
  eventoId: string;
  participantes: Perfil[];
  onCreado?: () => void;
}

export function FormGasto({ eventoId, participantes, onCreado }: Props) {
  const [categoria, setCategoria] = useState<CategoriaGasto>('carne');
  const [cortes, setCortes] = useState<CorteCarne[]>([]);

  const [corteId, setCorteId] = useState('');
  const [nuevoCorte, setNuevoCorte] = useState('');
  const [gestionarCortes, setGestionarCortes] = useState(false);
  const [errorCorteId, setErrorCorteId] = useState<string | null>(null);
  const [errorCorteMsg, setErrorCorteMsg] = useState<string | null>(null);
  const gestionRef = useRef<HTMLDivElement>(null);
  const [kilogramos, setKilogramos] = useState('');
  const [concepto, setConcepto] = useState('');
  const [montoArs, setMontoArs] = useState('');
  const [pagadorId, setPagadorId] = useState(participantes[0]?.id ?? '');
  const [incluidos, setIncluidos] = useState<Set<string>>(new Set(participantes.map((p) => p.id)));
  const [ajustarDivision, setAjustarDivision] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarCortesCarne()
      .then((data) => {
        setCortes(data as CorteCarne[]);
        if (data.length > 0) setCorteId(data[0].id);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los cortes.'),
      );
  }, []);

  function toggleIncluido(id: string) {
    setIncluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAgregarCorte() {
    if (!nuevoCorte.trim()) return;
    const corte = await agregarCorteCarne(nuevoCorte.trim());
    setCortes((prev) => [...prev, corte as CorteCarne]);
    setCorteId((corte as CorteCarne).id);
    setNuevoCorte('');
  }

  async function handleBorrarCorte(id: string) {
    setErrorCorteId(null);
    setErrorCorteMsg(null);
    try {
      await borrarCorteCarne(id);
      setCortes((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (corteId === id) setCorteId(next[0]?.id ?? '');
        return next;
      });
    } catch (err) {
      setErrorCorteId(id);
      setErrorCorteMsg(err instanceof Error ? err.message : 'No se pudo borrar el corte.');
    }
  }

  useEffect(() => {
    if (!gestionarCortes) return;
    function handleClickFuera(e: MouseEvent) {
      if (gestionRef.current && !gestionRef.current.contains(e.target as Node)) {
        setGestionarCortes(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [gestionarCortes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const monto = Number(montoArs);
    if (!monto || monto <= 0) {
      setError('Poné un monto válido.');
      return;
    }
    if (!pagadorId) {
      setError('Decí quién pagó.');
      return;
    }
    if (categoria === 'carne' && (!corteId || !kilogramos || Number(kilogramos) <= 0)) {
      setError('Elegí un corte y los kilos.');
      return;
    }
    if (categoria === 'extra' && !concepto.trim()) {
      setError('Poné el concepto del gasto.');
      return;
    }

    setGuardando(true);
    try {
      const division = calcularDivision(
        participantes.map((p) => p.id),
        ajustarDivision
          ? participantes
              .filter((p) => incluidos.has(p.id))
              .map((p) => ({ participanteId: p.id, proporcion: 1 }))
          : undefined,
      );

      await crearGasto({
        eventoId,
        categoria,
        corteId: categoria === 'carne' ? corteId : null,
        kilogramos: categoria === 'carne' ? Number(kilogramos) : null,
        concepto: categoria === 'extra' ? concepto.trim() : null,
        montoArs: monto,
        pagadorId,
        division,
      });

      setMontoArs('');
      setKilogramos('');
      setConcepto('');
      onCreado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
      <div className="relative flex rounded-full bg-surface-container-low p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setCategoria('carne')}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            categoria === 'carne' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          Carne / Achuras
        </button>
        <button
          type="button"
          onClick={() => setCategoria('extra')}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            categoria === 'extra' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          Extras / Bebidas
        </button>
      </div>

      {categoria === 'carne' ? (
        <>
          <div className="flex flex-col gap-xs">
            <label className="pl-2 text-sm font-semibold text-on-surface-variant">
              ¿Qué corte compraste?
            </label>
            <select
              value={corteId}
              onChange={(e) => setCorteId(e.target.value)}
              className="rounded-2xl border border-outline-variant bg-white px-4 py-3 text-lg text-on-surface shadow-sm"
            >
              {cortes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="flex gap-2 pl-2">
              <input
                value={nuevoCorte}
                onChange={(e) => setNuevoCorte(e.target.value)}
                placeholder="¿Falta un corte? Agregalo"
                className="flex-1 rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAgregarCorte}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-primary"
              >
                + Agregar
              </button>
              <button
                type="button"
                onClick={() => setGestionarCortes((v) => !v)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-error"
              >
                {gestionarCortes ? 'Listo' : '- Sacar'}
              </button>
            </div>
            {gestionarCortes && (
              <div
                ref={gestionRef}
                className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-white p-2"
              >
                {cortes.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-on-surface">
                      {c.nombre}
                      <button
                        type="button"
                        onClick={() => handleBorrarCorte(c.id)}
                        aria-label={`Borrar ${c.nombre}`}
                        className="material-symbols-outlined text-error"
                      >
                        delete
                      </button>
                    </div>
                    {errorCorteId === c.id && (
                      <p className="px-2 text-xs text-error">{errorCorteMsg}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-xs">
            <label className="pl-2 text-sm font-semibold text-on-surface-variant">
              Cantidad (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={kilogramos}
              onChange={(e) => setKilogramos(e.target.value)}
              className="rounded-2xl border border-outline-variant bg-white px-4 py-3 text-lg text-on-surface shadow-sm"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-xs">
          <label className="pl-2 text-sm font-semibold text-on-surface-variant">Concepto</label>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Carbón, hielo, bebidas..."
            className="rounded-2xl border border-outline-variant bg-white px-4 py-3 text-lg text-on-surface shadow-sm"
          />
        </div>
      )}

      <div className="flex flex-col gap-xs">
        <label className="pl-2 text-sm font-semibold text-on-surface-variant">Precio total</label>
        <div className="flex items-center rounded-2xl border border-outline-variant bg-white px-4 py-3 shadow-sm">
          <span className="pr-1 text-on-surface-variant">$</span>
          <input
            type="number"
            step="100"
            value={montoArs}
            onChange={(e) => setMontoArs(e.target.value)}
            placeholder="0"
            className="w-full text-lg text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-sm">
        <label className="pl-2 text-sm font-semibold text-on-surface-variant">¿Quién pagó?</label>
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
          {participantes.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPagadorId(p.id)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <Avatar
                perfil={p}
                activo={pagadorId === p.id}
                circleClassName={`border-2 ${
                  pagadorId === p.id
                    ? 'border-secondary-container'
                    : 'border-transparent bg-surface-container-high text-on-surface-variant'
                }`}
              />
              <span className="max-w-[64px] truncate text-xs">{primerNombre(p.nombre)}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAjustarDivision((v) => !v)}
        className="pl-2 text-left text-sm font-semibold text-primary"
      >
        {ajustarDivision ? 'Usar división equitativa' : 'Ajustar entre quiénes se divide'}
      </button>
      {ajustarDivision && (
        <div className="flex flex-wrap gap-2">
          {participantes.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                incluidos.has(p.id)
                  ? 'bg-primary-container/20 text-primary'
                  : 'bg-surface-container-low text-on-surface-variant line-through'
              }`}
            >
              <input
                type="checkbox"
                checked={incluidos.has(p.id)}
                onChange={() => toggleIncluido(p.id)}
                className="sr-only"
              />
              {p.nombre ?? 'Sin nombre'}
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="flex items-center justify-center gap-2 rounded-xl bg-secondary-container py-4 font-display text-sm font-bold uppercase tracking-widest text-on-secondary-container shadow-[0px_8px_24px_rgba(116,172,223,0.25)] transition-transform active:scale-95 disabled:opacity-60"
      >
        <span className="material-symbols-outlined icon-fill">add_circle</span>
        {guardando ? 'Sumando...' : 'Sumar al pozo'}
      </button>
    </form>
  );
}
