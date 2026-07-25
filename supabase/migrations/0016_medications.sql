-- Medikamente & Supplements (Datenbank-Tab "Medikamente"): Nutzer legt fest,
-- was in welcher Frequenz eingenommen werden soll (taeglich, an bestimmten
-- Wochentagen, alle X Tage, oder nach Bedarf). Daraus leitet die UI pro Tag
-- eine Checkliste ab (siehe src/core/medicationSchedule.ts); abgehakte
-- Einnahmen landen als je ein Log-Eintrag pro Medikament und Tag.

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text not null default '',
  category text not null default 'medikament' check (category in ('medikament', 'supplement')),
  frequency_type text not null default 'taeglich' check (frequency_type in ('taeglich', 'wochentage', 'intervall', 'nach_bedarf')),
  weekdays smallint[] not null default '{}',
  interval_days integer,
  start_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medications_user_active
  on medications (user_id, active);

alter table medications enable row level security;

create policy "medications: owner read"
  on medications for select
  using (auth.uid() = user_id);

create policy "medications: owner insert"
  on medications for insert
  with check (auth.uid() = user_id);

create policy "medications: owner update"
  on medications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "medications: owner delete"
  on medications for delete
  using (auth.uid() = user_id);

create table if not exists medication_intake_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  medication_id uuid not null references medications(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (medication_id, log_date)
);

create index if not exists idx_medication_intake_logs_user_date
  on medication_intake_logs (user_id, log_date);

alter table medication_intake_logs enable row level security;

create policy "medication_intake_logs: owner read"
  on medication_intake_logs for select
  using (auth.uid() = user_id);

create policy "medication_intake_logs: owner insert"
  on medication_intake_logs for insert
  with check (auth.uid() = user_id);

create policy "medication_intake_logs: owner delete"
  on medication_intake_logs for delete
  using (auth.uid() = user_id);
