/**
 * Fragekatalog aus "Familienanamnese – Genetisches Risiko" (Rundum-
 * Gesundheitsuntersuchung). Statische Referenzdaten, framework-agnostisch
 * wie der Rest von src/core -- verwendet vom Ganz-Körper-Check-Wizard.
 */

export interface FamilyHistoryQuestion {
  key: string;
  label: string;
}

export interface FamilyHistorySection {
  key: string;
  title: string;
  questions: FamilyHistoryQuestion[];
}

export const FAMILY_HISTORY_SECTIONS: FamilyHistorySection[] = [
  {
    key: 'herz_kreislauf',
    title: 'Herz-Kreislauf-Erkrankungen',
    questions: [
      { key: 'herzinfarkt_frueh', label: 'Herzinfarkt bei einem Elternteil oder Geschwister vor dem 55. (Mann) bzw. 65. Lebensjahr (Frau)?' },
      { key: 'schlaganfall_jung', label: 'Schlaganfall bei einem nahen Verwandten in jungem Alter?' },
      { key: 'ploetzlicher_herztod', label: 'Plötzlicher Herztod bei einem jungen, sonst gesunden Angehörigen?' },
      { key: 'familiaere_hypercholesterinaemie', label: 'Bekannte familiäre Hypercholesterinämie oder sehr hohe Cholesterinwerte in der Familie?' },
      { key: 'aortenaneurysma_bindegewebe', label: 'Aortenaneurysma, Aortendissektion oder Bindegewebserkrankung (z. B. Marfan) in der Familie?' },
      { key: 'bluthochdruck_mehrere', label: 'Bluthochdruck bei mehreren nahen Verwandten?' },
    ],
  },
  {
    key: 'krebs',
    title: 'Krebserkrankungen',
    questions: [
      { key: 'brust_eierstockkrebs_frueh', label: 'Brust- oder Eierstockkrebs bei einer Verwandten, insbesondere vor dem 50. Lebensjahr?' },
      { key: 'brustkrebs_mann', label: 'Brustkrebs bei einem männlichen Familienmitglied?' },
      { key: 'darmkrebs_gebaermutterkrebs_frueh', label: 'Darmkrebs oder Gebärmutterschleimhautkrebs bei einem Verwandten vor dem 50. Lebensjahr?' },
      { key: 'multiple_darmpolypen', label: 'Multiple Darmpolypen bei einem Familienmitglied bekannt?' },
      { key: 'bauchspeicheldruesenkrebs_kombination', label: 'Bauchspeicheldrüsenkrebs in Kombination mit Brust-/Eierstockkrebs in der Familie?' },
      { key: 'prostatakrebs_frueh_aggressiv', label: 'Prostatakrebs, insbesondere früh aufgetreten oder aggressiv, in der Familie?' },
      { key: 'hautkrebs_melanom_mehrere', label: 'Hautkrebs (Melanom) bei mehreren Verwandten?' },
      { key: 'schilddruesenkrebs_medullaer', label: 'Schilddrüsenkrebs (insbesondere medullär) in der Familie?' },
      { key: 'zwei_verwandte_gleiche_krebsart', label: 'Zwei oder mehr Verwandte mit der gleichen oder verwandten Krebserkrankung?' },
    ],
  },
  {
    key: 'stoffwechsel_hormone',
    title: 'Stoffwechsel- und Hormonerkrankungen',
    questions: [
      { key: 'diabetes_typ1', label: 'Diabetes mellitus Typ 1 bei einem nahen Verwandten?' },
      { key: 'diabetes_typ2', label: 'Diabetes mellitus Typ 2 bei Eltern oder Geschwistern?' },
      { key: 'schilddruesenerkrankung', label: 'Schilddrüsenerkrankung (z. B. Hashimoto, Morbus Basedow) in der Familie?' },
      { key: 'haemochromatose', label: 'Bekannte Eisenspeicherkrankheit (Hämochromatose) in der Familie?' },
    ],
  },
  {
    key: 'neuro_psychiatrisch',
    title: 'Neurologische und psychiatrische Erkrankungen',
    questions: [
      { key: 'demenz_frueh', label: 'Demenz bei einem Elternteil, insbesondere vor dem 65. Lebensjahr aufgetreten?' },
      { key: 'chorea_huntington', label: 'Chorea Huntington oder andere neurodegenerative Erkrankung in der Familie bekannt?' },
      { key: 'parkinson_jung', label: 'Parkinson-Erkrankung bei jungem Erkrankungsalter in der Familie?' },
      { key: 'depression_bipolar_schizophrenie', label: 'Depression, bipolare Störung oder Schizophrenie bei nahen Verwandten?' },
    ],
  },
  {
    key: 'nieren_autoimmun_gerinnung',
    title: 'Nieren-, Autoimmun- und Gerinnungserkrankungen',
    questions: [
      { key: 'zystennieren', label: 'Zystennieren (polyzystische Nierenerkrankung) in der Familie?' },
      { key: 'autoimmunerkrankung', label: 'Autoimmunerkrankung (z. B. rheumatoide Arthritis, Lupus, Zöliakie) bei Verwandten?' },
      { key: 'thrombosen_lungenembolien', label: 'Wiederholte Thrombosen oder Lungenembolien in der Familie?' },
      { key: 'seltene_erbkrankheit', label: 'Bekannte seltene Erbkrankheit in der Familie (z. B. Mukoviszidose, Sichelzellanämie)?' },
    ],
  },
  {
    key: 'hintergrund',
    title: 'Hintergrund',
    questions: [
      { key: 'ethnische_zugehoerigkeit', label: 'Besteht eine bekannte ethnische Zugehörigkeit mit erhöhtem genetischem Risiko (z. B. aschkenasisch-jüdische Abstammung)?' },
      { key: 'humangenetische_beratung', label: 'Wurde bereits eine humangenetische Beratung oder ein Gentest bei Ihnen oder in der Familie durchgeführt?' },
    ],
  },
];

export const FAMILY_HISTORY_QUESTION_COUNT = FAMILY_HISTORY_SECTIONS.reduce(
  (sum, section) => sum + section.questions.length,
  0,
);
