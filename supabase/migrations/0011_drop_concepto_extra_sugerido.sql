-- Limpieza: concepto_extra_sugerido quedó huérfana. El único código que la leía
-- (listarConceptosSugeridos + el <datalist> de autocompletado en FormGasto) se sacó al
-- agregar el borrado de cortes de carne, y nada la escribe tampoco. Solo tenía los 6
-- nombres estáticos del seed original (Carbón, Hielo, Pan, Chimichurri, Bebidas,
-- Ensaladas) — trivial de recrear si el autocompletado vuelve a implementarse.

drop table concepto_extra_sugerido;
