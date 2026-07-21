'use client';

import { useState } from 'react';
import { OrganSheet } from './OrganSheet';

type Organ = {
  id: string;
  name: string;
};

type Marker = {
  organId: string;
  /** Position in % of the body illustration's bounding box. */
  top: number;
  left: number;
};

type System = {
  name: string;
  organIds: string[];
};

const ORGANS: Organ[] = [
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

const SYSTEMS: System[] = [
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
const MARKERS: Marker[] = [
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

function organName(organId: string): string {
  return ORGANS.find((o) => o.id === organId)?.name ?? organId;
}

function BodySilhouette() {
  return (
    <svg viewBox="0 0 200 440" className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
      <circle cx="100" cy="38" r="26" fill="var(--vitalis-gray-2)" />
      <line
        x1="100"
        y1="64"
        x2="100"
        y2="250"
        stroke="var(--vitalis-gray-2)"
        strokeWidth="56"
        strokeLinecap="round"
      />
      <line x1="72" y1="90" x2="35" y2="190" stroke="var(--vitalis-gray-2)" strokeWidth="22" strokeLinecap="round" />
      <line x1="128" y1="90" x2="165" y2="190" stroke="var(--vitalis-gray-2)" strokeWidth="22" strokeLinecap="round" />
      <line x1="85" y1="250" x2="65" y2="420" stroke="var(--vitalis-gray-2)" strokeWidth="26" strokeLinecap="round" />
      <line x1="115" y1="250" x2="135" y2="420" stroke="var(--vitalis-gray-2)" strokeWidth="26" strokeLinecap="round" />
    </svg>
  );
}

export function BodyOrganMap() {
  const [selectedOrganId, setSelectedOrganId] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-10 lg:flex-row lg:justify-center">
      <div className="relative mx-auto w-full max-w-[300px] shrink-0" style={{ aspectRatio: '200 / 440' }}>
        <BodySilhouette />
        {MARKERS.map((marker, index) => (
          <button
            key={`${marker.organId}-${index}`}
            type="button"
            onClick={() => setSelectedOrganId(marker.organId)}
            style={{ top: `${marker.top}%`, left: `${marker.left}%` }}
            className="group absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow transition hover:z-10 hover:scale-125 hover:bg-brand-deep focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand/50"
            aria-label={organName(marker.organId)}
          >
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {organName(marker.organId)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-md flex-col gap-5">
        {SYSTEMS.map((system) => (
          <div key={system.name}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{system.name}</h3>
            <div className="flex flex-wrap gap-2">
              {system.organIds.map((organId) => (
                <button
                  key={organId}
                  type="button"
                  onClick={() => setSelectedOrganId(organId)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-brand hover:text-brand-deep"
                >
                  {organName(organId)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedOrganId ? (
        <OrganSheet organName={organName(selectedOrganId)} onClose={() => setSelectedOrganId(null)} />
      ) : null}
    </div>
  );
}
