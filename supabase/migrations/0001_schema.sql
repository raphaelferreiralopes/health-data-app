-- Personal-Health-Data-App MVP: core schema
-- Catalog tables (categories/subcategories/parameters/reference ranges) are
-- shared reference data. lab_results is the only user-owned table.

create extension if not exists "pgcrypto";

create table if not exists lab_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tab text not null check (tab in ('blutanalyse', 'urin', 'stuhl', 'allergie')),
  sort_order int not null default 0
);

create table if not exists lab_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references lab_categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists lab_parameters (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references lab_subcategories(id) on delete cascade,
  name text not null,
  unit text,
  description_short text not null default '',
  -- Placeholder field: swap for real trusted sources per parameter later.
  learn_more_url text not null default '',
  result_type text not null check (result_type in ('numeric', 'qualitative')),
  sort_order int not null default 0
);

create table if not exists lab_reference_ranges (
  id uuid primary key default gen_random_uuid(),
  parameter_id uuid not null references lab_parameters(id) on delete cascade,
  -- numeric ranges (result_type = 'numeric'); leave null when unbounded on one side
  min numeric,
  max numeric,
  -- qualitative "normal" value (result_type = 'qualitative'), e.g. 'negativ'
  qualitative_normal text,
  gender text not null default 'all' check (gender in ('m', 'f', 'all')),
  age_min int,
  age_max int
);

-- Verlauf ist vorbereitet: mehrere lab_results pro parameter_id/user_id sind
-- erlaubt, die App zeigt aktuell nur measured_at desc limit 1 pro Parameter.
create table if not exists lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parameter_id uuid not null references lab_parameters(id) on delete cascade,
  value numeric,
  value_qualitative text,
  measured_at date not null,
  source_document_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_lab_results_user_parameter_measured
  on lab_results (user_id, parameter_id, measured_at desc);

create index if not exists idx_lab_subcategories_category on lab_subcategories(category_id);
create index if not exists idx_lab_parameters_subcategory on lab_parameters(subcategory_id);
create index if not exists idx_lab_reference_ranges_parameter on lab_reference_ranges(parameter_id);
