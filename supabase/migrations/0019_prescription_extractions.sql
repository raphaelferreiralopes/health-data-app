-- Logs every Rezept-Foto-Extraktion (see /api/medications/extract), erfolgreich
-- oder nicht, damit die Route ein Tageslimit pro Nutzer für Gemini-Aufrufe
-- durchsetzen kann -- siehe DAILY_EXTRACTION_LIMIT in route.ts. Token-Zahlen
-- dienen nur der Kostenübersicht, nicht der Limit-Durchsetzung.

create table if not exists prescription_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  matched_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_prescription_extractions_user_created
  on prescription_extractions (user_id, created_at desc);

alter table prescription_extractions enable row level security;

create policy "prescription_extractions: owner read"
  on prescription_extractions for select
  using (auth.uid() = user_id);
