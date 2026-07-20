-- Demo/seed data: 18 Parameter über die 4 MVP-Tabs, mit Referenzbereichen
-- und Beispiel-Werten für einen festen Demo-User.
--
-- Referenzbereiche sind PLATZHALTER (plausible Literaturwerte, keine
-- validierten Laborreferenzen) und learn_more_url zeigt auf eine
-- Platzhalter-Domain -- beides muss vor echtem Einsatz durch geprüfte
-- Quellen ersetzt werden. Siehe README "Nächste Schritte".

truncate table lab_results, lab_reference_ranges, lab_parameters, lab_subcategories, lab_categories cascade;

-- Demo-User (kein Auth im MVP aktiv, siehe src/core/demoUser.ts)
-- 00000000-0000-0000-0000-000000000001

-- ===== Kategorien =====
insert into lab_categories (id, name, tab, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Hämatologie', 'blutanalyse', 1),
  ('10000000-0000-0000-0000-000000000002', 'Klinische Chemie / Organfunktion', 'blutanalyse', 2),
  ('10000000-0000-0000-0000-000000000003', 'Eisenstoffwechsel & Vitamine', 'blutanalyse', 3),
  ('10000000-0000-0000-0000-000000000004', 'Hormone', 'blutanalyse', 4),
  ('10000000-0000-0000-0000-000000000005', 'Entzündung & Immunsystem', 'blutanalyse', 5),
  ('10000000-0000-0000-0000-000000000006', 'Herz-Kreislauf-Marker', 'blutanalyse', 6),
  ('10000000-0000-0000-0000-000000000007', 'Urin-Diagnostik', 'urin', 1),
  ('10000000-0000-0000-0000-000000000008', 'Stuhl-Diagnostik', 'stuhl', 1),
  ('10000000-0000-0000-0000-000000000009', 'Allergiediagnostik', 'allergie', 1);

-- ===== Unterkategorien =====
insert into lab_subcategories (id, category_id, name, sort_order) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blutbild', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Nieren- & Leberwerte', 1),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Eisenstoffwechsel', 1),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Vitamine', 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Schilddrüse', 1),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'Sexualhormone', 2),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'Akute-Phase-Marker', 1),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000006', 'Lipidprofil', 1),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', 'Urinstatus', 1),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000007', 'Urinkultur', 2),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000008', 'Entzündungsmarker', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000008', 'Erreger-Diagnostik', 2),
  -- Allergiediagnostik: alle 7 Unterkategorien laut Katalog angelegt,
  -- MVP-Seed liefert nur für 2 davon tatsächliche Werte.
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000009', 'Inhalationsallergene', 1),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000009', 'Nahrungsmittelallergene', 2),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000009', 'Insektengifte', 3),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000009', 'Kontaktallergene', 4),
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000009', 'Medikamentenallergien', 5),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'Gesamt-IgE', 6),
  ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000009', 'Spezifisches IgE-Panel (sonstige)', 7);

-- ===== Parameter =====
-- learn_more_url ist bewusst eine austauschbare Platzhalter-Domain.
insert into lab_parameters (id, subcategory_id, name, unit, description_short, learn_more_url, result_type, sort_order) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Hämoglobin', 'g/dl', 'Sauerstofftransportprotein der roten Blutkörperchen; zentraler Marker für Anämie.', 'https://platzhalter-lexikon.example/haemoglobin', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Leukozyten', '/nl', 'Weiße Blutkörperchen; erhöht bei Infektionen und Entzündungen.', 'https://platzhalter-lexikon.example/leukozyten', 'numeric', 2),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Kreatinin', 'mg/dl', 'Abbauprodukt der Muskulatur; zentraler Marker der Nierenfunktion.', 'https://platzhalter-lexikon.example/kreatinin', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'ALT (GPT)', 'U/l', 'Leberenzym; erhöht bei Leberzellschäden.', 'https://platzhalter-lexikon.example/alt-gpt', 'numeric', 2),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'Ferritin', 'ng/ml', 'Eisenspeicherprotein; wichtigster Marker für Eisenmangel oder -überladung.', 'https://platzhalter-lexikon.example/ferritin', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', 'Vitamin D (25-OH)', 'ng/ml', 'Speicherform von Vitamin D; relevant für Knochen-, Immun- und Muskelfunktion.', 'https://platzhalter-lexikon.example/vitamin-d', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 'TSH', 'mU/l', 'Steuerhormon der Hirnanhangdrüse für die Schilddrüse; wichtigster Screening-Wert.', 'https://platzhalter-lexikon.example/tsh', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006', 'Testosteron gesamt', 'ng/dl', 'Wichtigstes männliches Sexualhormon; auch bei Frauen in geringer Menge vorhanden.', 'https://platzhalter-lexikon.example/testosteron', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000007', 'CRP', 'mg/l', 'C-reaktives Protein; unspezifischer Marker für akute Entzündungen.', 'https://platzhalter-lexikon.example/crp', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000008', 'LDL-Cholesterin', 'mg/dl', '"Schlechtes" Cholesterin; zentraler Risikofaktor für Arteriosklerose.', 'https://platzhalter-lexikon.example/ldl-cholesterin', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000009', 'Urin-pH', null, 'Säuregrad des Urins; beeinflusst u. a. durch Ernährung und Infektionen.', 'https://platzhalter-lexikon.example/urin-ph', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000009', 'Urin-Protein', null, 'Eiweißausscheidung im Urin; erhöht als früher Hinweis auf Nierenschäden.', 'https://platzhalter-lexikon.example/urin-protein', 'qualitative', 2),
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000010', 'Urinkultur', null, 'Bakteriologischer Nachweis; bestätigt oder schließt einen Harnwegsinfekt aus.', 'https://platzhalter-lexikon.example/urinkultur', 'qualitative', 1),
  ('30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000011', 'Calprotectin', 'µg/g', 'Entzündungsmarker im Stuhl; unterscheidet entzündliche von funktionellen Darmerkrankungen.', 'https://platzhalter-lexikon.example/calprotectin', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000012', 'Helicobacter-pylori-Antigen', null, 'Nachweis des magenschleimhautbesiedelnden Bakteriums H. pylori im Stuhl.', 'https://platzhalter-lexikon.example/h-pylori', 'qualitative', 1),
  ('30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000012', 'Occultes Blut (Hämoccult)', null, 'Nachweis von nicht sichtbarem Blut im Stuhl; Screening-Marker u. a. für Darmkrebs.', 'https://platzhalter-lexikon.example/occultes-blut', 'qualitative', 2),
  ('30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000018', 'Gesamt-IgE', 'kU/l', 'Gesamtmenge des Antikörpertyps IgE im Blut; allgemeiner Hinweis auf allergische Neigung.', 'https://platzhalter-lexikon.example/gesamt-ige', 'numeric', 1),
  ('30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000013', 'Birkenpollen spezifisches IgE', 'kU/l', 'Spezifischer Antikörper gegen Birkenpollen; Nachweis einer Sensibilisierung.', 'https://platzhalter-lexikon.example/birkenpollen-ige', 'numeric', 2);

-- ===== Referenzbereiche (Platzhalterwerte, keine validierten Laborreferenzen) =====
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max) values
  ('30000000-0000-0000-0000-000000000001', 13.5, 17.5, null, 'm', null, null),
  ('30000000-0000-0000-0000-000000000001', 12.0, 15.5, null, 'f', null, null),
  ('30000000-0000-0000-0000-000000000002', 4.0, 10.0, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000003', 0.7, 1.2, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000004', null, 45, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000005', 30, 400, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000006', 30, 100, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000007', 0.4, 4.0, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000008', 264, 916, null, 'm', null, null),
  ('30000000-0000-0000-0000-000000000008', 15, 70, null, 'f', null, null),
  ('30000000-0000-0000-0000-000000000009', null, 5, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000010', null, 130, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000011', 5.0, 7.0, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000012', null, null, 'negativ', 'all', null, null),
  ('30000000-0000-0000-0000-000000000013', null, null, 'kein Wachstum', 'all', null, null),
  ('30000000-0000-0000-0000-000000000014', null, 50, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000015', null, null, 'negativ', 'all', null, null),
  ('30000000-0000-0000-0000-000000000016', null, null, 'negativ', 'all', null, null),
  ('30000000-0000-0000-0000-000000000017', null, 100, null, 'all', null, null),
  ('30000000-0000-0000-0000-000000000018', null, 0.35, null, 'all', null, null);

-- ===== Demo-Ergebnisse (fester Demo-User) =====
-- CRP hat bewusst 2 Messungen, um "neuester Wert gewinnt" zu demonstrieren.
insert into lab_results (user_id, parameter_id, value, value_qualitative, measured_at) values
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 14.2, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 9.8, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 1.3, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 28, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 18, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', 22, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', 2.1, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008', 480, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009', 3.1, null, '2026-05-01'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009', 6.2, null, '2026-06-15'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000010', 145, null, '2026-06-10'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011', 6.0, null, '2026-06-12'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012', null, 'negativ', '2026-06-12'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000013', null, 'kein Wachstum', '2026-06-12'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000014', 35, null, '2026-06-05'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000015', null, 'negativ', '2026-06-05'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000016', null, 'negativ', '2026-06-05'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000017', 145, null, '2026-05-20'),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000018', 2.1, null, '2026-05-20');
