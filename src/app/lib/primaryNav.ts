export const PRIMARY_NAV_ITEMS = [
  { href: '/datenbank', label: 'Datenbank' },
  // Ausgeblendet für den ersten Beta-Kreis, noch nicht gelöscht -- einfach
  // wieder eintragen, sobald sie gezeigt werden sollen.
  // Home hat keinen eigenen Inhalt mehr (redirectet auf /datenbank/diagnostik,
  // siehe home/page.tsx) und ist deshalb aus der Nav entfernt.
  // { href: '/home', label: 'Home' },
  // { href: '/prozesse', label: 'Prozesse' },
  // { href: '/biomarker-map', label: 'BioMarker Map' },
  // { href: '/longevity-hub', label: 'Longevity Hub' },
] as const;
