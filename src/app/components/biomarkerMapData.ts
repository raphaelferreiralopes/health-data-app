export type Organ = {
  id: string;
  name: string;
};

export type Marker = {
  organId: string;
  /** Position in % of the body illustration's bounding box. */
  top: number;
  left: number;
};

export type System = {
  name: string;
  organIds: string[];
};

export type BiomarkerCategory = 'Kern' | 'Ergänzend';

export type Biomarker = {
  name: string;
  kategorie: BiomarkerCategory;
  zielbereich: string;
  testintervall: string;
  anmerkung: string;
};

export const ORGANS: Organ[] = [
  { id: 'herz', name: 'Herz' },
  { id: 'lunge', name: 'Lunge' },
  { id: 'blutgefaesse', name: 'Blutgefäße' },
  { id: 'leber', name: 'Leber' },
  { id: 'magen', name: 'Magen' },
  { id: 'duenndarm', name: 'Dünndarm' },
  { id: 'dickdarm', name: 'Dickdarm' },
  { id: 'pankreas', name: 'Bauchspeicheldrüse' },
  { id: 'gallenblase', name: 'Gallenblase' },
  { id: 'speiseroehre', name: 'Speiseröhre' },
  { id: 'niere', name: 'Nieren' },
  { id: 'harnblase', name: 'Harnblase' },
  { id: 'gehirn', name: 'Gehirn' },
  { id: 'rueckenmark', name: 'Rückenmark' },
  { id: 'schilddruese', name: 'Schilddrüse' },
  { id: 'nebenniere', name: 'Nebennieren' },
  { id: 'milz', name: 'Milz' },
  { id: 'lymphsystem', name: 'Lymphknoten/Lymphsystem' },
  { id: 'haut', name: 'Haut' },
  { id: 'fortpflanzungsorgane', name: 'Fortpflanzungsorgane' },
];

export const SYSTEMS: System[] = [
  { name: 'Kreislauf- und Atmungssystem', organIds: ['herz', 'lunge', 'blutgefaesse'] },
  {
    name: 'Verdauungssystem',
    organIds: ['leber', 'magen', 'duenndarm', 'dickdarm', 'pankreas', 'gallenblase', 'speiseroehre'],
  },
  { name: 'Ausscheidungssystem', organIds: ['niere', 'harnblase'] },
  { name: 'Nervensystem', organIds: ['gehirn', 'rueckenmark'] },
  { name: 'Hormonsystem', organIds: ['schilddruese', 'nebenniere'] },
  { name: 'Immunsystem', organIds: ['milz', 'lymphsystem'] },
  { name: 'Sonstige lebenswichtige Organe', organIds: ['haut', 'fortpflanzungsorgane'] },
];

// Positions are tuned by eye against the body illustration's viewBox below.
// Paired organs (Lunge, Nieren, Nebennieren) get two markers pointing at the
// same organ id.
export const MARKERS: Marker[] = [
  { organId: 'gehirn', top: 7.7, left: 50 },
  { organId: 'rueckenmark', top: 14.5, left: 50 },
  { organId: 'schilddruese', top: 18.2, left: 50 },
  { organId: 'speiseroehre', top: 21.8, left: 50 },
  { organId: 'lunge', top: 24.1, left: 39 },
  { organId: 'lunge', top: 24.1, left: 61 },
  { organId: 'herz', top: 28.2, left: 50 },
  { organId: 'lymphsystem', top: 29.5, left: 72.5 },
  { organId: 'blutgefaesse', top: 34.1, left: 25 },
  { organId: 'leber', top: 36.8, left: 40 },
  { organId: 'magen', top: 36.4, left: 60 },
  { organId: 'milz', top: 38.6, left: 70 },
  { organId: 'nebenniere', top: 39.5, left: 34 },
  { organId: 'nebenniere', top: 39.5, left: 66 },
  { organId: 'pankreas', top: 40.9, left: 50 },
  { organId: 'gallenblase', top: 42.7, left: 45 },
  { organId: 'niere', top: 44.8, left: 32 },
  { organId: 'niere', top: 44.8, left: 68 },
  { organId: 'duenndarm', top: 47.7, left: 50 },
  { organId: 'dickdarm', top: 51.8, left: 44 },
  { organId: 'harnblase', top: 54.5, left: 56 },
  { organId: 'fortpflanzungsorgane', top: 56.4, left: 50 },
  { organId: 'haut', top: 68.2, left: 60.5 },
];

export function organName(organId: string): string {
  return ORGANS.find((o) => o.id === organId)?.name ?? organId;
}

// Source: biomarker_map.xlsx. "Darm" in der Quelle deckt Dünn- und Dickdarm
// gemeinsam ab (im Datensatz nicht weiter unterschieden), daher gilt die
// gleiche Liste für beide Organ-IDs.
const DARM_BIOMARKERS: Biomarker[] = [
  {
    name: 'Calprotectin (Stuhl)',
    kategorie: 'Kern',
    zielbereich: '< 50 µg/g',
    testintervall: 'bei Symptomen, nicht routinemäßig',
    anmerkung: 'Erstlinien-Screening Darmentzündung',
  },
  {
    name: 'Vitamin D (25-OH)',
    kategorie: 'Kern',
    zielbereich: '30-50 ng/ml (100-125 nmol/l)',
    testintervall: '2x/Jahr (Winter/Sommer)',
    anmerkung: 'Immunfunktion (Zuordnung diskutabel)',
  },
  {
    name: 'H. pylori-Antigen (Stuhl)',
    kategorie: 'Ergänzend',
    zielbereich: 'negativ',
    testintervall: 'einmalig bei Verdacht/Symptomen',
    anmerkung: 'Eigentlich Magen, nicht Darm',
  },
  {
    name: 'Ferritin/Eisen',
    kategorie: 'Ergänzend',
    zielbereich: 'siehe Leber-Werte',
    testintervall: 'jährlich',
    anmerkung: 'Malabsorptionshinweis',
  },
  {
    name: 'Mikrobiom-Diversitätsindex',
    kategorie: 'Ergänzend',
    zielbereich: 'keine klinische Standardisierung',
    testintervall: 'optional',
    anmerkung: 'Noch kein etablierter Standard',
  },
];

export const BIOMARKERS_BY_ORGAN: Record<string, Biomarker[]> = {
  gehirn: [
    {
      name: 'Homocystein',
      kategorie: 'Kern',
      zielbereich: '< 10-12 µmol/l (optimal); >15 µmol/l erhöht',
      testintervall: '1-2x/Jahr bei Risiko, sonst alle 2-3 Jahre',
      anmerkung: 'Assoziiert mit Hirnatrophie/Demenzrisiko',
    },
    {
      name: 'Vitamin B12 (Holo-TC empfohlen)',
      kategorie: 'Kern',
      zielbereich: '> 300-350 pg/ml',
      testintervall: 'jährlich, bei veganer Ernährung häufiger',
      anmerkung: 'Nervenfunktion',
    },
    {
      name: 'TSH',
      kategorie: 'Kern',
      zielbereich: '0,4-2,5 mIU/l (funktionell)',
      testintervall: 'jährlich',
      anmerkung: 'Schilddrüse beeinflusst Kognition',
    },
    {
      name: 'HbA1c',
      kategorie: 'Ergänzend',
      zielbereich: '< 5,7 %',
      testintervall: 'jährlich',
      anmerkung: 'Insulinresistenz als Risikofaktor für kognitiven Abbau',
    },
    {
      name: 'Folsäure',
      kategorie: 'Ergänzend',
      zielbereich: '> 3 ng/ml',
      testintervall: 'jährlich',
      anmerkung: 'Co-Faktor Homocystein-Stoffwechsel',
    },
    {
      name: 'Vitamin D',
      kategorie: 'Ergänzend',
      zielbereich: '30-50 ng/ml',
      testintervall: '2x/Jahr',
      anmerkung: 'Neuroprotektive Assoziationen',
    },
  ],
  schilddruese: [
    {
      name: 'TSH',
      kategorie: 'Kern',
      zielbereich: '0,4-4,0 mIU/l',
      testintervall: 'jährlich',
      anmerkung: 'Primärer Screening-Marker',
    },
    {
      name: 'fT4',
      kategorie: 'Kern',
      zielbereich: '12-22 pmol/l',
      testintervall: 'bei auffälligem TSH',
      anmerkung: 'Aktives Hormon',
    },
    {
      name: 'fT3',
      kategorie: 'Kern',
      zielbereich: '3,1-6,8 pmol/l',
      testintervall: 'bei auffälligem TSH',
      anmerkung: 'Aktives Hormon',
    },
    {
      name: 'TPO-Antikörper',
      kategorie: 'Kern',
      zielbereich: '< 34 IU/ml',
      testintervall: 'einmalig, bei Verdacht',
      anmerkung: 'Autoimmunthyreoiditis (Hashimoto)',
    },
    {
      name: 'Thyreoglobulin-Antikörper',
      kategorie: 'Ergänzend',
      zielbereich: '< 115 IU/ml',
      testintervall: 'bei Verdacht auf Autoimmunerkrankung',
      anmerkung: 'Ergänzt TPO-AK',
    },
  ],
  lunge: [
    {
      name: 'Spirometrie FEV1',
      kategorie: 'Kern',
      zielbereich: '> 80 % des Solls',
      testintervall: 'alle 1-3 Jahre, Raucher jährlich',
      anmerkung: 'Goldstandard Lungenfunktion',
    },
    {
      name: 'Spirometrie FVC / FEV1/FVC-Ratio',
      kategorie: 'Kern',
      zielbereich: 'FEV1/FVC > 0,7',
      testintervall: 'alle 1-3 Jahre',
      anmerkung: 'Obstruktion vs. Restriktion',
    },
    {
      name: 'Sauerstoffsättigung SpO2 (Wearable)',
      kategorie: 'Kern',
      zielbereich: '95-100 %',
      testintervall: 'täglich',
      anmerkung: 'Kontinuierliches Monitoring',
    },
    {
      name: 'Atemfrequenz (Ruhe)',
      kategorie: 'Kern',
      zielbereich: '12-20 /min',
      testintervall: 'täglich',
      anmerkung: 'Wearable-fähig',
    },
    {
      name: 'hs-CRP',
      kategorie: 'Ergänzend',
      zielbereich: '< 1 mg/l',
      testintervall: 'jährlich',
      anmerkung: 'Systemische Entzündung',
    },
    {
      name: 'Alpha-1-Antitrypsin',
      kategorie: 'Ergänzend',
      zielbereich: 'im Normbereich des Labors',
      testintervall: 'einmalig bei familiärer Vorbelastung/früher COPD',
      anmerkung: 'Genetische Ursache Emphysem',
    },
  ],
  herz: [
    {
      name: 'LDL-Cholesterin',
      kategorie: 'Kern',
      zielbereich: '< 116 mg/dl (individuell risikoabhängig niedriger)',
      testintervall: 'jährlich',
      anmerkung: 'Standard-Gefäßrisiko',
    },
    {
      name: 'ApoB',
      kategorie: 'Kern',
      zielbereich: '< 90 mg/dl (Standardrisiko), < 65 mg/dl (hohes Risiko)',
      testintervall: 'jährlich, wenn verfügbar',
      anmerkung: 'Präziser als LDL',
    },
    {
      name: 'Lp(a)',
      kategorie: 'Kern',
      zielbereich: '< 30 mg/dl bzw. < 75 nmol/l',
      testintervall: 'einmalig im Leben',
      anmerkung: 'Genetisch determiniert, ESC/EAS 2019',
    },
    {
      name: 'hs-CRP',
      kategorie: 'Kern',
      zielbereich: '< 1 mg/l (niedrig), 1-3 (moderat), >3 (hoch)',
      testintervall: 'jährlich',
      anmerkung: 'Stille Gefäßentzündung',
    },
    {
      name: 'HDL-Cholesterin',
      kategorie: 'Kern',
      zielbereich: '> 40 mg/dl (m), > 50 mg/dl (w)',
      testintervall: 'jährlich',
      anmerkung: 'Teil des Lipidprofils',
    },
    {
      name: 'Triglyzeride',
      kategorie: 'Kern',
      zielbereich: '< 150 mg/dl',
      testintervall: 'jährlich',
      anmerkung: 'Teil des Lipidprofils',
    },
    {
      name: 'Ruhepuls (Wearable)',
      kategorie: 'Kern',
      zielbereich: '50-70 /min',
      testintervall: 'täglich',
      anmerkung: 'Autonome Regulation',
    },
    {
      name: 'HRV (Wearable)',
      kategorie: 'Kern',
      zielbereich: 'individuelle Baseline, Trend relevant',
      testintervall: 'täglich',
      anmerkung: 'Autonome Regulation',
    },
    {
      name: 'Blutdruck',
      kategorie: 'Ergänzend',
      zielbereich: '< 120/80 mmHg',
      testintervall: 'täglich bis wöchentlich',
      anmerkung: 'Oft fehlender zentraler Marker',
    },
    {
      name: 'NT-proBNP',
      kategorie: 'Ergänzend',
      zielbereich: '< 125 pg/ml',
      testintervall: 'bei Verdacht auf Herzinsuffizienz',
      anmerkung: 'Herzinsuffizienz-Marker',
    },
  ],
  leber: [
    {
      name: 'ALT',
      kategorie: 'Kern',
      zielbereich: '< 33 U/l (w), < 41 U/l (m)',
      testintervall: 'jährlich',
      anmerkung: 'Leberzellschaden',
    },
    {
      name: 'AST',
      kategorie: 'Kern',
      zielbereich: 'ähnlich ALT-Bereich',
      testintervall: 'jährlich',
      anmerkung: 'Leberzellschaden',
    },
    {
      name: 'GGT',
      kategorie: 'Kern',
      zielbereich: '< 38 U/l (w), < 55 U/l (m)',
      testintervall: 'jährlich',
      anmerkung: 'Empfindlich, aber unspezifisch',
    },
    {
      name: 'Ferritin',
      kategorie: 'Kern',
      zielbereich: '30-150 ng/ml (w), 30-300 ng/ml (m)',
      testintervall: 'jährlich',
      anmerkung: 'Eisenspeicher, NAFLD/Hämochromatose',
    },
    {
      name: 'Bilirubin gesamt',
      kategorie: 'Ergänzend',
      zielbereich: '0,3-1,2 mg/dl',
      testintervall: 'jährlich',
      anmerkung: 'Syntheseleistung/Ausscheidung',
    },
    {
      name: 'Albumin',
      kategorie: 'Ergänzend',
      zielbereich: '3,5-5,0 g/dl',
      testintervall: 'jährlich',
      anmerkung: 'Syntheseleistung der Leber',
    },
    {
      name: 'FIB-4 Score',
      kategorie: 'Ergänzend',
      zielbereich: '< 1,3 (niedriges Fibroserisiko)',
      testintervall: 'bei auffälligen Basiswerten',
      anmerkung: 'Fibrose-Risiko-Score',
    },
  ],
  niere: [
    {
      name: 'Kreatinin / eGFR',
      kategorie: 'Kern',
      zielbereich: 'eGFR > 90 ml/min/1,73m²',
      testintervall: 'jährlich',
      anmerkung: 'CKD ab eGFR <60 über >=3 Monate',
    },
    {
      name: 'Cystatin C',
      kategorie: 'Kern',
      zielbereich: '0,53-0,95 mg/l',
      testintervall: 'bei auffälligem eGFR/geringer Muskelmasse',
      anmerkung: 'Präziser bei früher Einschränkung',
    },
    {
      name: 'Albumin-Kreatinin-Ratio (Urin)',
      kategorie: 'Kern',
      zielbereich: '< 30 mg/g',
      testintervall: 'jährlich, bei Diabetes/Hypertonie halbjährlich',
      anmerkung: 'Frühester Marker, vor eGFR-Abfall',
    },
    {
      name: 'Harnsäure',
      kategorie: 'Ergänzend',
      zielbereich: '< 6,0 mg/dl (w), < 7,0 mg/dl (m)',
      testintervall: 'jährlich',
      anmerkung: 'Gicht-/Nierenrisiko',
    },
    {
      name: 'Natrium/Kalium',
      kategorie: 'Ergänzend',
      zielbereich: 'Na 135-145 mmol/l, K 3,5-5,0 mmol/l',
      testintervall: 'jährlich',
      anmerkung: 'Elektrolythaushalt',
    },
  ],
  duenndarm: DARM_BIOMARKERS,
  dickdarm: DARM_BIOMARKERS,
};

// Aus dem "Hinweise"-Tabellenblatt der Quelldatei.
export const BIOMARKER_HINWEISE: string[] = [
  'Zielbereiche sind grobe Orientierungswerte und variieren je nach Labor/Assay/Alter/Geschlecht.',
  'Diese Tabelle ersetzt keine ärztliche Diagnose oder individuelle Beratung.',
];
