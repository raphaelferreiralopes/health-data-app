create table if not exists analysis_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  notes text,
  file_name text,
  file_type text,
  file_data text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_uploads_user_created
  on analysis_uploads (user_id, created_at desc);

alter table analysis_uploads enable row level security;

create policy "analysis_uploads: owner read"
  on analysis_uploads for select
  using (auth.uid() = user_id);

create policy "analysis_uploads: owner insert"
  on analysis_uploads for insert
  with check (auth.uid() = user_id);

create policy "analysis_uploads: owner update"
  on analysis_uploads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "analysis_uploads: owner delete"
  on analysis_uploads for delete
  using (auth.uid() = user_id);
