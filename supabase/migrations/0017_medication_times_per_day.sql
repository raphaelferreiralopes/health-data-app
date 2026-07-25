-- Manche Supplements/Medikamente werden mehrmals täglich genommen (z. B.
-- 2x täglich); times_per_day steuert, wie viele Einnahme-Slots pro geplantem
-- Tag auf der Checkliste erscheinen. Jeder Slot wird einzeln abgehakt, daher
-- braucht medication_intake_logs einen dose_index statt einem einzigen
-- Log pro Tag.

alter table medications
  add column if not exists times_per_day smallint not null default 1 check (times_per_day between 1 and 6);

alter table medication_intake_logs
  add column if not exists dose_index smallint not null default 0;

alter table medication_intake_logs
  drop constraint if exists medication_intake_logs_medication_id_log_date_key;

alter table medication_intake_logs
  add constraint medication_intake_logs_medication_id_log_date_dose_key
  unique (medication_id, log_date, dose_index);
