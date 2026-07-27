-- Logs every chatbot turn (see /api/chat) so the route can enforce a
-- per-user hourly cap on Gemini calls before making one -- see
-- RATE_LIMIT_MAX_MESSAGES in route.ts. Token counts are stored for cost
-- visibility, not enforcement. Message content itself is never stored here
-- -- the client keeps the conversation in memory and resends history with
-- each turn (see ChatBubble.tsx), so there's no server-side chat log.

create table if not exists chat_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_interactions_user_created
  on chat_interactions (user_id, created_at desc);

alter table chat_interactions enable row level security;

create policy "chat_interactions: owner read"
  on chat_interactions for select
  using (auth.uid() = user_id);
