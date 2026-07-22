-- Ganz-Körper-Check (Prozesse-Tab): Körpermaße + Familienanamnese-Fragebogen.
-- Ein Eintrag pro abgeschlossenem Durchlauf; die App zeigt aktuell nur den
-- jeweils neuesten (analog lab_results/getTabOverview).

create table if not exists body_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  height_cm numeric,
  weight_kg numeric,
  biological_sex text check (biological_sex in ('m', 'f')),
  wants_document_upload boolean,
  -- { "answers": { [questionKey]: boolean }, "sectionNotes": { [sectionKey]: string } }
  -- siehe src/core/familyHistoryQuestionnaire.ts für den Fragekatalog.
  family_history jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_body_checks_user_created
  on body_checks (user_id, created_at desc);

alter table body_checks enable row level security;

create policy "body_checks: owner read"
  on body_checks for select
  using (auth.uid() = user_id);

create policy "body_checks: owner insert"
  on body_checks for insert
  with check (auth.uid() = user_id);

create policy "body_checks: owner update"
  on body_checks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "body_checks: owner delete"
  on body_checks for delete
  using (auth.uid() = user_id);
