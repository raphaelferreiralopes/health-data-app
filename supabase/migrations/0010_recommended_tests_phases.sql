-- Erweitert "Empfohlene Tests" um einen mehrstufigen Vorsorge-Fahrplan:
-- Phase 1 (bestehend) = Vitalwerte/Blutbild/Urin, Phase 2 = Facharzttermine
-- (Zahnarzt, Augenarzt, HNO, Hautarzt, Allergologe), Phase 3 = Krebsvorsorge
-- (Hautkrebs-Screening + Darmkrebsvorsorge für alle, plus Mammographie/
-- gynäkologische Vorsorge bzw. Prostata-Vorsorge je nach biological_sex).
-- Die Reihenfolge (Phase 2 erst nach Phase 1, Phase 3 erst nach Phase 2) wird
-- clientseitig durchgesetzt -- siehe /prozesse/empfohlene-tests.

alter table recommended_tests add column if not exists phase smallint not null default 1 check (phase in (1, 2, 3));

create index if not exists idx_recommended_tests_phase
  on recommended_tests (body_check_id, phase);

-- Der ursprüngliche test_key-check erlaubte nur die drei Phase-1-Werte;
-- ersetzen (unabhängig vom automatisch vergebenen Constraint-Namen) durch
-- eine Fassung, die auch die neuen Phase-2/3-Werte zulässt.
do $$
declare
  con record;
begin
  for con in
    select pg_con.conname
    from pg_constraint pg_con
    join pg_class rel on rel.oid = pg_con.conrelid
    where rel.relname = 'recommended_tests'
      and pg_con.contype = 'c'
      and pg_get_constraintdef(pg_con.oid) like '%test_key%'
  loop
    execute format('alter table recommended_tests drop constraint %I', con.conname);
  end loop;
end $$;

alter table recommended_tests add constraint recommended_tests_test_key_check check (test_key in (
  'vitalwerte_arzt', 'grosses_blutbild', 'urin_probe',
  'zahnarzt', 'augenarzt', 'hno_arzt', 'hautarzt', 'allergologe',
  'hautkrebs_screening', 'darmkrebsvorsorge', 'mammographie_gyn', 'prostata_vorsorge'
));
