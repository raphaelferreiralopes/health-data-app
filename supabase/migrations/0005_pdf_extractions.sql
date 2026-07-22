-- Logs every PDF-extraction API call (see /api/analysis-uploads/extract),
-- successful or not, so the route can enforce a per-user daily cap on
-- Anthropic API calls before making one -- see DAILY_EXTRACTION_LIMIT in
-- route.ts. token counts are stored for cost visibility, not enforcement.

create table if not exists pdf_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  matched_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pdf_extractions_user_created
  on pdf_extractions (user_id, created_at desc);

alter table pdf_extractions enable row level security;

create policy "pdf_extractions: owner read"
  on pdf_extractions for select
  using (auth.uid() = user_id);
