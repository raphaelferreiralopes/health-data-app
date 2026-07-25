export type DatenbankSection = 'diagnostik' | 'daten' | 'medikamente' | 'dokumente' | 'empfehlung';

export const DATENBANK_SECTIONS: { value: DatenbankSection; label: string; href: string }[] = [
  { value: 'diagnostik', label: 'Diagnostik', href: '/datenbank/diagnostik' },
  { value: 'daten', label: 'Daten', href: '/datenbank/daten' },
  { value: 'empfehlung', label: 'Empfehlung', href: '/datenbank/empfehlung' },
  { value: 'medikamente', label: 'Medikamente', href: '/datenbank/medikamente' },
  { value: 'dokumente', label: 'Dokumente', href: '/datenbank/dokumente' },
];
