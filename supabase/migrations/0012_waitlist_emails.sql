-- Waitlist signups from the standalone landing page (longevitystack repo,
-- hosted separately from this app). Anonymous inserts only -- no select,
-- update, or delete through the API, so a signup can never be read back
-- or enumerated via the anon key.

create table if not exists waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist_emails enable row level security;

create policy "waitlist_emails: anon insert"
  on waitlist_emails for insert
  to anon
  with check (true);
