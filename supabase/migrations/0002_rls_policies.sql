-- Row Level Security
-- Catalog tables are non-personal reference data: readable by anyone
-- (anon + authenticated), writable by nobody through the API.
-- lab_results is personal data: scoped to auth.uid() = user_id so that
-- multi-user auth works correctly the moment it is turned on. Until then,
-- the MVP backend reads with the Supabase service-role key (server-only,
-- bypasses RLS by design) and filters explicitly by a fixed demo user id
-- -- see src/core/demoUser.ts.

alter table lab_categories enable row level security;
alter table lab_subcategories enable row level security;
alter table lab_parameters enable row level security;
alter table lab_reference_ranges enable row level security;
alter table lab_results enable row level security;

create policy "catalog: public read - categories"
  on lab_categories for select
  using (true);

create policy "catalog: public read - subcategories"
  on lab_subcategories for select
  using (true);

create policy "catalog: public read - parameters"
  on lab_parameters for select
  using (true);

create policy "catalog: public read - reference ranges"
  on lab_reference_ranges for select
  using (true);

create policy "lab_results: owner read"
  on lab_results for select
  using (auth.uid() = user_id);

create policy "lab_results: owner insert"
  on lab_results for insert
  with check (auth.uid() = user_id);

create policy "lab_results: owner update"
  on lab_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lab_results: owner delete"
  on lab_results for delete
  using (auth.uid() = user_id);
