-- OAuth connections to third-party wearable/health APIs (Whoop, Fitbit via
-- the Google Health API). One row per user per provider; access/refresh
-- tokens are stored server-side only and read exclusively through the
-- service-role client (see supabaseServer.ts), same trust model as every
-- other table here -- never exposed to the browser.
create table if not exists wearable_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null check (provider in ('whoop', 'fitbit')),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_wearable_connections_user on wearable_connections (user_id);

alter table wearable_connections enable row level security;

create policy "wearable_connections: owner read"
  on wearable_connections for select
  using (auth.uid() = user_id);

create policy "wearable_connections: owner insert"
  on wearable_connections for insert
  with check (auth.uid() = user_id);

create policy "wearable_connections: owner update"
  on wearable_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wearable_connections: owner delete"
  on wearable_connections for delete
  using (auth.uid() = user_id);
