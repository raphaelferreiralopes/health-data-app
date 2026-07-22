-- Empfohlene Tests nach dem Ganz-Körper-Check: pro Abschluss werden drei feste
-- Tests angelegt (Vitalwerte beim Arzt, Großes Blutbild, Urinprobe), deren
-- Fortschritt der Nutzer manuell durchklickt (Termin gebucht -> gemacht ->
-- Resultat erhalten -> hochgeladen). Siehe /prozesse/empfohlene-tests.

create table if not exists recommended_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  body_check_id uuid not null references body_checks (id) on delete cascade,
  test_key text not null check (test_key in ('vitalwerte_arzt', 'grosses_blutbild', 'urin_probe')),
  status text not null default 'offen' check (status in ('offen', 'termin_gebucht', 'gemacht', 'resultat_erhalten', 'hochgeladen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (body_check_id, test_key)
);

create index if not exists idx_recommended_tests_user_body_check
  on recommended_tests (user_id, body_check_id);

alter table recommended_tests enable row level security;

create policy "recommended_tests: owner read"
  on recommended_tests for select
  using (auth.uid() = user_id);

create policy "recommended_tests: owner insert"
  on recommended_tests for insert
  with check (auth.uid() = user_id);

create policy "recommended_tests: owner update"
  on recommended_tests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recommended_tests: owner delete"
  on recommended_tests for delete
  using (auth.uid() = user_id);
