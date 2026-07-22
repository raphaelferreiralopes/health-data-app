-- Adds draft/resume support to body_checks: progress is now saved after
-- every step (status = 'in_progress') instead of only once at the very end,
-- so an aborted Ganz-Körper Check can be resumed later from the same card.

alter table body_checks add column if not exists status text not null default 'completed' check (status in ('in_progress', 'completed'));
alter table body_checks add column if not exists phase text not null default 'measurements' check (phase in ('measurements', 'documents', 'questionnaire', 'summary', 'done'));
alter table body_checks add column if not exists question_index int not null default 0;
alter table body_checks add column if not exists completed_at timestamptz;
alter table body_checks add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_body_checks_user_status
  on body_checks (user_id, status, updated_at desc);
