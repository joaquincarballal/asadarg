-- Atomiza el alta de un gasto: el cliente insertaba `gasto` y después
-- `gasto_participante` en 2 requests separados — si el segundo fallaba (red caída, RLS,
-- lo que sea) quedaba un gasto sin división y los balances mentían. Los 2 inserts ahora
-- corren adentro de esta función, que aborta entera (rollback) si cualquiera falla.
-- security invoker (default): corre con los privilegios de quien llama, sigue sujeta a
-- las mismas RLS policies de gasto/gasto_participante que ya existían.

create function crear_gasto(
  p_evento_id uuid,
  p_categoria text,
  p_corte_id uuid,
  p_kilogramos numeric,
  p_concepto text,
  p_monto_ars numeric,
  p_cotizacion_usd_venta numeric,
  p_monto_usd numeric,
  p_precio_por_kg numeric,
  p_pagador_id uuid,
  p_cargado_por_id uuid,
  p_division jsonb
)
returns gasto
language plpgsql
as $$
declare
  v_gasto gasto;
begin
  insert into gasto (
    evento_id, categoria, corte_id, kilogramos, concepto, monto_ars,
    cotizacion_usd_venta, monto_usd, precio_por_kg, pagador_id, cargado_por_id
  ) values (
    p_evento_id, p_categoria, p_corte_id, p_kilogramos, p_concepto, p_monto_ars,
    p_cotizacion_usd_venta, p_monto_usd, p_precio_por_kg, p_pagador_id, p_cargado_por_id
  )
  returning * into v_gasto;

  insert into gasto_participante (gasto_id, participante_id, proporcion)
  select v_gasto.id, (d->>'participanteId')::uuid, (d->>'proporcion')::numeric
  from jsonb_array_elements(p_division) as d;

  return v_gasto;
end;
$$;

grant execute on function crear_gasto(
  uuid, text, uuid, numeric, text, numeric, numeric, numeric, numeric, uuid, uuid, jsonb
) to authenticated;
