# Contrato externo: dolarapi.com

Dependencia externa de solo lectura, sin autenticación. Se usa al guardar cualquier gasto
(FR-012).

## Endpoints usados

- `GET https://dolarapi.com/v1/dolares/blue`
- `GET https://dolarapi.com/v1/dolares/bolsa` (dólar MEP)

## Response shape (ambos endpoints)

```json
{
  "moneda": "USD",
  "casa": "blue",
  "nombre": "Blue",
  "compra": 1510,
  "venta": 1530,
  "fechaActualizacion": "2026-07-19T21:00:00.000Z"
}
```

## Campo usado

`venta` — se persiste como `gasto.cotizacion_usd_venta`.

## Manejo de errores (FR-020)

Si el fetch falla (timeout, 5xx, red caída), el frontend DEBE:
1. Guardar el gasto igual, con `cotizacion_usd_venta = NULL` y `monto_usd = NULL`.
2. No reintentar automáticamente ni bloquear el formulario de carga.
3. Mostrar el monto ARS igual, marcando visualmente "USD no disponible" en vez del
   equivalente.

No hay reintento en background para completar la cotización después — si falta, queda
faltante para ese gasto (simplicidad, ver Principio I).
