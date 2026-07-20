-- Asadarg: esquema inicial (T008)
-- Ver specs/001-asadarg-mvp/data-model.md para el detalle de cada entidad.

create extension if not exists "pgcrypto";

-- perfil: extiende auth.users 1:1, no lo reemplaza.
create table perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando alguien se loguea por primera vez con Google.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfil (id, nombre, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create table evento (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha date not null,
  asador_titular_id uuid references perfil (id),
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  creado_por uuid not null references perfil (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table evento_participante (
  evento_id uuid not null references evento (id) on delete cascade,
  participante_id uuid not null references perfil (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (evento_id, participante_id)
);

create index evento_participante_participante_idx on evento_participante (participante_id);

create table foto_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento (id) on delete cascade,
  storage_path text not null,
  subida_por uuid not null references perfil (id),
  created_at timestamptz not null default now()
);

create table corte_carne (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

insert into corte_carne (nombre) values
  ('Asado/Tira'), ('Vacío'), ('Matambre'), ('Entraña'), ('Bondiola'),
  ('Chorizo'), ('Morcilla'), ('Chinchulines'), ('Mollejas'), ('Riñones'),
  ('Pollo'), ('Cerdo'), ('Provoleta');

create table concepto_extra_sugerido (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into concepto_extra_sugerido (nombre) values
  ('Carbón'), ('Hielo'), ('Pan'), ('Chimichurri'), ('Bebidas'), ('Ensaladas');

create table gasto (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento (id) on delete cascade,
  categoria text not null check (categoria in ('carne', 'extra')),
  corte_id uuid references corte_carne (id),
  kilogramos numeric check (kilogramos is null or kilogramos > 0),
  concepto text,
  monto_ars numeric not null check (monto_ars > 0),
  cotizacion_usd_venta numeric,
  monto_usd numeric,
  precio_por_kg numeric,
  pagador_id uuid not null references perfil (id),
  cargado_por_id uuid not null references perfil (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gasto_categoria_shape check (
    (categoria = 'carne' and corte_id is not null and kilogramos is not null)
    or
    (categoria = 'extra' and concepto is not null and concepto <> '')
  )
);

create index gasto_evento_idx on gasto (evento_id);
create index gasto_created_at_idx on gasto (created_at);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gasto_set_updated_at
  before update on gasto
  for each row execute procedure set_updated_at();

create table gasto_participante (
  gasto_id uuid not null references gasto (id) on delete cascade,
  participante_id uuid not null references perfil (id) on delete cascade,
  proporcion numeric not null check (proporcion > 0),
  primary key (gasto_id, participante_id)
);

create table settlement (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento (id) on delete cascade,
  de_participante_id uuid not null references perfil (id),
  a_participante_id uuid not null references perfil (id),
  monto_ars numeric not null,
  pagado boolean not null default false,
  pagado_at timestamptz,
  created_at timestamptz not null default now()
);

create index settlement_evento_idx on settlement (evento_id);
