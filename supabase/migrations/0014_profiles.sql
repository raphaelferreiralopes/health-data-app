-- Profil: Geschlecht + Geburtsdatum, damit alters-/geschlechtsspezifische
-- Referenzwerte (siehe lab_reference_ranges, pickApplicableRange) auf echte
-- Nutzer statt nur auf den DEMO_USER_PROFILE-Platzhalter angewendet werden.

create table if not exists profiles (
  user_id uuid primary key,
  gender text not null check (gender in ('m', 'f')),
  date_of_birth date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: owner read"
  on profiles for select
  using (auth.uid() = user_id);

create policy "profiles: owner insert"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles: owner update"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
