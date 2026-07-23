-- Quellenangabe pro Referenzbereich, damit Herkunft der Werte nachvollziehbar ist
-- (z. B. Uniklinik-Laborhandbuch, Herstellerpackungsbeilage, Fachliteratur).
alter table lab_reference_ranges add column if not exists source text;
