-- Arzttermine (Admin-Tab): einfache Liste anstehender (und vergangener)
-- Arzttermine, die der Nutzer selbst einträgt -- kein Sync mit externen
-- Kalendern, nur Titel/Arzt/Ort/Datum/Uhrzeit/Notiz.

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  doctor_name text not null default '',
  location text not null default '',
  appointment_date date not null,
  appointment_time time,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_user_date
  on appointments (user_id, appointment_date);

alter table appointments enable row level security;

create policy "appointments: owner read"
  on appointments for select
  using (auth.uid() = user_id);

create policy "appointments: owner insert"
  on appointments for insert
  with check (auth.uid() = user_id);

create policy "appointments: owner update"
  on appointments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "appointments: owner delete"
  on appointments for delete
  using (auth.uid() = user_id);
