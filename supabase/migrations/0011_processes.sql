-- Frei startbare Verlaufs-Prozesse (Prozesse-Tab): Nutzer wählt einen von
-- drei festen Typen (Grippe, Rückenschmerzen, Knie Operation) und verfolgt
-- ihn mit dem gleichen 4-Stufen-Tracker wie die empfohlenen Tests (Termin
-- gebucht -> gemacht -> Resultat erhalten -> hochgeladen; siehe
-- src/core/processStages.ts). Mehrere Prozesse -- auch mehrfach vom gleichen
-- Typ nacheinander -- können parallel laufen; abgeschlossene bleiben als
-- Verlauf erhalten statt gelöscht zu werden.

create table if not exists processes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  process_type text not null check (process_type in ('grippe', 'ruecken_schmerzen', 'knie_operation')),
  status text not null default 'offen' check (status in ('offen', 'termin_gebucht', 'gemacht', 'resultat_erhalten', 'hochgeladen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_processes_user_created
  on processes (user_id, created_at desc);

alter table processes enable row level security;

create policy "processes: owner read"
  on processes for select
  using (auth.uid() = user_id);

create policy "processes: owner insert"
  on processes for insert
  with check (auth.uid() = user_id);

create policy "processes: owner update"
  on processes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "processes: owner delete"
  on processes for delete
  using (auth.uid() = user_id);
