export type DatenbankSection = 'diagnostik' | 'daten' | 'dokumente' | 'empfehlung';

export const DATENBANK_SECTIONS: { value: DatenbankSection; label: string; href: string }[] = [
  { value: 'diagnostik', label: 'Diagnostik', href: '/datenbank/diagnostik' },
  { value: 'daten', label: 'Daten', href: '/datenbank/daten' },
  { value: 'dokumente', label: 'Dokumente', href: '/datenbank/dokumente' },
  // Ausgeblendet bis Inhalt da ist, noch nicht gelöscht -- einfach wieder
  // eintragen, sobald der Tab echte Daten zeigt (siehe primaryNav.ts für
  // dasselbe Muster).
  // { value: 'empfehlung', label: 'Empfehlung', href: '/datenbank/empfehlung' },
];
