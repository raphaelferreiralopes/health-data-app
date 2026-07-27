-- Arztbefund-Upload: Nutzer laden einen ärztlichen Befund (PDF) hoch und
-- erhalten eine KI-generierte Erklärung in drei Verständlichkeitsstufen,
-- analog zu den Erklärstufen der Laborparameter (description_level1/2/3).
-- Die Erklärung wird einmalig bei Gemini erzeugt und zusammen mit dem
-- Dokument gespeichert, statt bei jedem Ansehen neu generiert zu werden.
create table if not exists arztbefund_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  file_name text,
  file_data text not null,
  explanation_level1 text not null,
  explanation_level2 text not null,
  explanation_level3 text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_arztbefund_uploads_user_created
  on arztbefund_uploads (user_id, created_at desc);

alter table arztbefund_uploads enable row level security;

create policy "arztbefund_uploads: owner read"
  on arztbefund_uploads for select
  using (auth.uid() = user_id);

create policy "arztbefund_uploads: owner insert"
  on arztbefund_uploads for insert
  with check (auth.uid() = user_id);

create policy "arztbefund_uploads: owner delete"
  on arztbefund_uploads for delete
  using (auth.uid() = user_id);
