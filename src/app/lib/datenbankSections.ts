export type DatenbankSection = 'diagnostik' | 'daten' | 'medikamente' | 'dokumente';

export const DATENBANK_SECTIONS: { value: DatenbankSection; label: string; href: string }[] = [
  { value: 'diagnostik', label: 'Diagnostik', href: '/datenbank/diagnostik' },
  { value: 'daten', label: 'Daten', href: '/datenbank/daten' },
  { value: 'medikamente', label: 'Medikamente', href: '/datenbank/medikamente' },
  { value: 'dokumente', label: 'Dokumente', href: '/datenbank/dokumente' },
];
