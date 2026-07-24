-- Altersgestaffelte Referenzbereiche für 14 Parameter, bei denen eine echte,
-- zitierfähige adulte Alterszäsur existiert (recherchiert aus DACH-Laborquellen
-- -- Uniklinikum Ulm/Münster, IMD Potsdam -- sowie etablierten internationalen
-- Studien wo keine DACH-Quelle vorlag). Für alle anderen 122 Parameter wurde
-- eine Alterszäsur gezielt recherchiert und NICHT gefunden bzw. nicht als
-- eigenständiger Referenzwert etabliert (z. B. Elektrolyte, Lipide, eGFR,
-- HbA1c, allergen-spezifisches IgE) -- die bleiben unverändert unisex/
-- altersunabhängig, siehe Recherche-Notizen im zugehörigen Chat.
--
-- Altersbänder sind bewusst lückenlos partitioniert (kein offenes Ende trifft
-- zwei Bänder gleichzeitig), damit pickApplicableRange() genau eine Zeile pro
-- Alter/Geschlecht matcht.

-- ===== Hämatologie (Quelle: IMD Potsdam, Referenzbereiche Standort Potsdam,
-- Stand 01.08.2023) =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'erythrocytes');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'erythrocytes'), 4.3, 5.75, null, 'm', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'erythrocytes'), 4.0, 5.65, null, 'm', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'erythrocytes'), 3.90, 5.15, null, 'f', null, 49, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'erythrocytes'), 3.90, 5.20, null, 'f', 50, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'erythrocytes'), 3.85, 5.20, null, 'f', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'hemoglobin');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'hemoglobin'), 13.5, 17.2, null, 'm', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hemoglobin'), 12.5, 17.2, null, 'm', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hemoglobin'), 12.0, 15.4, null, 'f', null, 49, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hemoglobin'), 12.0, 15.6, null, 'f', 50, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hemoglobin'), 11.8, 15.8, null, 'f', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'hematocrit');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'hematocrit'), 39.5, 50.5, null, 'm', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hematocrit'), 37.0, 49.0, null, 'm', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023 (Quelltabelle druckt hier "55-99 Jahre" statt 65 wie bei allen Nachbarparametern -- als Tippfehler gewertet und auf 65 normalisiert)'),
  ((select id from lab_parameters where key = 'hematocrit'), 35.5, 45.0, null, 'f', null, 49, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hematocrit'), 35.5, 45.5, null, 'f', 50, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'hematocrit'), 35.0, 45.5, null, 'f', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023 (siehe Tippfehler-Hinweis oben)');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'mcv');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'mcv'), 80, 99, null, 'all', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'mcv'), 80, 101, null, 'all', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'mch');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'mch'), 27.0, 33.5, null, 'all', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'mch'), 27.0, 34.0, null, 'all', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'leukocytes');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'leukocytes'), 3.9, 10.2, null, 'all', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'leukocytes'), 3.6, 10.5, null, 'all', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'platelets');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'platelets'), 150, 370, null, 'all', null, 64, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023'),
  ((select id from lab_parameters where key = 'platelets'), 160, 370, null, 'all', 65, null, 'IMD Potsdam, Referenzbereiche Standort Potsdam, Stand 01.08.2023');

-- ===== Blutsenkung (BSG/ESR) -- altersabhängige Formel (Miller 1983), hier
-- als diskretisierte Bänder gemäß der Uniklinikum-Ulm-Tabelle =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'bsg');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'bsg'), null, 28, null, 'm', null, 49, 'Uniklinikum Ulm, Klinische Chemie, Leistungsverzeichnis BSG (Rev. 003/05.12.2024); konsistent mit Miller-Formel (Miller A et al., BMJ 1983;286:266)'),
  ((select id from lab_parameters where key = 'bsg'), null, 37, null, 'm', 50, 70, 'Uniklinikum Ulm, Klinische Chemie, Leistungsverzeichnis BSG (Rev. 003/05.12.2024)'),
  ((select id from lab_parameters where key = 'bsg'), null, 37, null, 'f', null, 49, 'Uniklinikum Ulm, Klinische Chemie, Leistungsverzeichnis BSG (Rev. 003/05.12.2024)'),
  ((select id from lab_parameters where key = 'bsg'), null, 39, null, 'f', 50, 70, 'Uniklinikum Ulm, Klinische Chemie, Leistungsverzeichnis BSG (Rev. 003/05.12.2024)'),
  ((select id from lab_parameters where key = 'bsg'), 3, 46, null, 'all', 71, null, 'Uniklinikum Ulm, Klinische Chemie, Leistungsverzeichnis BSG (Rev. 003/05.12.2024)');

-- ===== PSA -- klassische altersspezifische Referenzbereiche (Oesterling 1993),
-- auch in der deutschen S3-Leitlinie Prostatakarzinom zitiert =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'psa');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'psa'), null, 4.0, null, 'm', null, 39, 'Onkologie-Standardquellen (allgemeiner Cutoff, Oesterling-Tabelle beginnt erst bei 40 J.)'),
  ((select id from lab_parameters where key = 'psa'), null, 2.5, null, 'm', 40, 49, 'Oesterling JE et al., JAMA 1993;270(7):860-864; zitiert in dt. S3-Leitlinie Prostatakarzinom'),
  ((select id from lab_parameters where key = 'psa'), null, 3.5, null, 'm', 50, 59, 'Oesterling JE et al., JAMA 1993;270(7):860-864; zitiert in dt. S3-Leitlinie Prostatakarzinom'),
  ((select id from lab_parameters where key = 'psa'), null, 4.5, null, 'm', 60, 69, 'Oesterling JE et al., JAMA 1993;270(7):860-864; zitiert in dt. S3-Leitlinie Prostatakarzinom'),
  ((select id from lab_parameters where key = 'psa'), null, 6.5, null, 'm', 70, null, 'Oesterling JE et al., JAMA 1993;270(7):860-864 (Originaltabelle bis 79 J., hier offen fortgeschrieben)');

-- ===== TSH -- Anstieg des oberen Referenzwerts im Alter (NHANES III) =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'tsh');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'tsh'), 0.40, 3.98, null, 'all', null, 29, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11 (NHANES III, altersgestaffelt)'),
  ((select id from lab_parameters where key = 'tsh'), 0.39, 4.17, null, 'all', 30, 39, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11'),
  ((select id from lab_parameters where key = 'tsh'), 0.44, 4.75, null, 'all', 40, 49, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11'),
  ((select id from lab_parameters where key = 'tsh'), 0.50, 5.07, null, 'all', 50, 59, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11'),
  ((select id from lab_parameters where key = 'tsh'), 0.46, 5.56, null, 'all', 60, 69, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11'),
  ((select id from lab_parameters where key = 'tsh'), 0.47, 7.11, null, 'all', 70, 79, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11'),
  ((select id from lab_parameters where key = 'tsh'), 0.44, 6.90, null, 'all', 80, null, 'Boucai L, Hollowell JG, Surks MI, Thyroid 2011;21(1):5-11');

-- ===== Testosteron -- bei Männern gut etablierter Altersabfall der Untergrenze
-- (Bhasin 2017, harmonisierte LC-MS/MS-Referenzintervalle). Bei Frauen keine
-- vergleichbare Tabelle gefunden, unveränderte Einzelzeile bleibt bestehen. =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'testosterone');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'testosterone'), 264, 916, null, 'm', null, 39, 'Bhasin S et al., J Clin Endocrinol Metab 2017;102(4):1161-1173 (harmonisierte LC-MS/MS-Referenzintervalle)'),
  ((select id from lab_parameters where key = 'testosterone'), 235, 929, null, 'm', 40, 49, 'Bhasin S et al., JCEM 2017;102(4):1161-1173'),
  ((select id from lab_parameters where key = 'testosterone'), 219, 929, null, 'm', 50, 59, 'Bhasin S et al., JCEM 2017;102(4):1161-1173'),
  ((select id from lab_parameters where key = 'testosterone'), 218, 929, null, 'm', 60, 69, 'Bhasin S et al., JCEM 2017;102(4):1161-1173'),
  ((select id from lab_parameters where key = 'testosterone'), 218, 926, null, 'm', 70, 79, 'Bhasin S et al., JCEM 2017;102(4):1161-1173'),
  ((select id from lab_parameters where key = 'testosterone'), 157, 913, null, 'm', 80, null, 'Bhasin S et al., JCEM 2017;102(4):1161-1173'),
  ((select id from lab_parameters where key = 'testosterone'), 15, 70, null, 'f', null, null, 'Mayo Clinic Laboratories Test Catalog – ähnlich (kein etabliertes altersgestaffeltes Referenzintervall für Frauen gefunden)');

-- ===== DHEA-S -- "Adrenopause": steiler, gut dokumentierter Dekaden-Abfall
-- (Uniklinikum Ulm/Roche-Packungsbeilage) =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'dhea_s');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'dhea_s'), 211, 492, null, 'm', null, 23, 'Uniklinikum Ulm (Zentrale Einrichtung Klinische Chemie), Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 160, 449, null, 'm', 24, 33, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 88.9, 427, null, 'm', 34, 43, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 44.3, 331, null, 'm', 44, 53, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 51.7, 295, null, 'm', 54, 63, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 33.6, 249, null, 'm', 64, 73, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 16.2, 123, null, 'm', 74, null, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 148, 407, null, 'f', null, 23, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 98.8, 340, null, 'f', 24, 33, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 60.9, 337, null, 'f', 34, 43, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 35.4, 256, null, 'f', 44, 53, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 18.9, 205, null, 'f', 54, 63, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 9.4, 246, null, 'f', 64, 73, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0'),
  ((select id from lab_parameters where key = 'dhea_s'), 12.0, 154, null, 'f', 74, null, 'Uniklinikum Ulm, Roche Elecsys DHEA-S Packungsbeilage 2024-02 V6.0');

-- ===== Harnstoff -- moderater Anstieg ab 51 J. (Uniklinikum Ulm, umgerechnet
-- aus mmol/l x6.006) =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'urea');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'urea'), 19.2, 43.8, null, 'm', null, 50, 'Uniklinikum Ulm, Leistungsverzeichnis Harnstoff (Thomas L., Labor und Diagnose, 8. Aufl. 2012, S.647), umgerechnet mmol/l→mg/dl (×6.006)'),
  ((select id from lab_parameters where key = 'urea'), 18.0, 55.2, null, 'm', 51, null, 'Uniklinikum Ulm, Leistungsverzeichnis Harnstoff, umgerechnet mmol/l→mg/dl (×6.006)'),
  ((select id from lab_parameters where key = 'urea'), 15.6, 40.2, null, 'f', null, 50, 'Uniklinikum Ulm, Leistungsverzeichnis Harnstoff, umgerechnet mmol/l→mg/dl (×6.006)'),
  ((select id from lab_parameters where key = 'urea'), 21.0, 43.2, null, 'f', 51, null, 'Uniklinikum Ulm, Leistungsverzeichnis Harnstoff, umgerechnet mmol/l→mg/dl (×6.006)');

-- ===== Kreatinin -- Obergrenze bei Männern ab 51 J. leicht höher (Uniklinikum
-- Münster, Jaffé-Methode; bestehende Untergrenzen aus NBME beibehalten, da
-- keine DACH-Quelle mit Untergrenze gefunden). Frauen unverändert. =====

delete from lab_reference_ranges where parameter_id = (select id from lab_parameters where key = 'creatinine');
insert into lab_reference_ranges (parameter_id, min, max, qualitative_normal, gender, age_min, age_max, source) values
  ((select id from lab_parameters where key = 'creatinine'), 0.7, 1.3, null, 'm', null, 50, 'Untergrenze: NBME Laboratory Reference Values; Obergrenze: Universitätsklinikum Münster, Labor-Referenzbereiche (Stand 30.01.2026, Jaffé/kinetisch-colorimetrisch)'),
  ((select id from lab_parameters where key = 'creatinine'), 0.7, 1.4, null, 'm', 51, null, 'Untergrenze: NBME Laboratory Reference Values; Obergrenze: Universitätsklinikum Münster, Labor-Referenzbereiche (Stand 30.01.2026, Jaffé/kinetisch-colorimetrisch)'),
  ((select id from lab_parameters where key = 'creatinine'), 0.6, 1.0, null, 'f', null, null, 'NBME Laboratory Reference Values (nbme.org) – ähnlich (keine DACH-Altersstaffelung für Frauen gefunden)');
