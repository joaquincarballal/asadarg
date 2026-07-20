import type { DolarCotizacion } from '../types';

const DOLARAPI_BASE = 'https://dolarapi.com/v1/dolares';

/**
 * Trae la cotización blue del día. Devuelve null si el servicio no responde —
 * el gasto igual se guarda en ARS (FR-020, ver contracts/dolarapi.md).
 */
export async function obtenerCotizacionBlue(): Promise<DolarCotizacion | null> {
  return fetchCotizacion('blue');
}

/** Dólar MEP — dolarapi.com lo expone bajo la casa "bolsa". */
export async function obtenerCotizacionMep(): Promise<DolarCotizacion | null> {
  return fetchCotizacion('bolsa');
}

async function fetchCotizacion(casa: 'blue' | 'bolsa'): Promise<DolarCotizacion | null> {
  try {
    const response = await fetch(`${DOLARAPI_BASE}/${casa}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return (await response.json()) as DolarCotizacion;
  } catch {
    // Red caída, timeout, servicio caído, etc. — no bloqueamos la carga del gasto.
    return null;
  }
}
