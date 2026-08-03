// Tipos de dominio de AsadARG — ver specs/001-asadarg-mvp/data-model.md

export interface Perfil {
  id: string;
  nombre: string | null;
  avatar_url: string | null;
  created_at: string;
  es_invitado: boolean;
}

export type EstadoEvento = 'abierto' | 'cerrado';

export interface Evento {
  id: string;
  nombre: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  asador_titular_id: string | null;
  estado: EstadoEvento;
  creado_por: string;
  created_at: string;
  closed_at: string | null;
}

export interface EventoParticipante {
  evento_id: string;
  participante_id: string;
  joined_at: string;
}

export interface FotoEvento {
  id: string;
  evento_id: string;
  storage_path: string;
  subida_por: string;
  created_at: string;
}

export interface CorteCarne {
  id: string;
  nombre: string;
  created_at: string;
}

export interface ConceptoExtraSugerido {
  id: string;
  nombre: string;
}

export type CategoriaGasto = 'carne' | 'extra';

export interface Gasto {
  id: string;
  evento_id: string;
  categoria: CategoriaGasto;
  corte_id: string | null;
  kilogramos: number | null;
  concepto: string | null;
  monto_ars: number;
  cotizacion_usd_venta: number | null;
  monto_usd: number | null;
  precio_por_kg: number | null;
  pagador_id: string;
  cargado_por_id: string;
  created_at: string;
  updated_at: string;
  corte_carne?: { nombre: string } | null;
}

export interface GastoParticipante {
  gasto_id: string;
  participante_id: string;
  proporcion: number;
}

export interface Settlement {
  id: string;
  evento_id: string;
  de_participante_id: string;
  a_participante_id: string;
  monto_ars: number;
  pagado: boolean;
  pagado_at: string | null;
  created_at: string;
}

export interface DolarCotizacion {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface BalanceParticipante {
  participanteId: string;
  pagado: number;
  corresponde: number;
  balance: number;
}
