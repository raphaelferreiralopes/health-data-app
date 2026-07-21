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

const ORGANS: Organ[] = [
  { id: 'gehirn', name: 'Gehirn' },
  { id: 'schilddruese', name: 'Schilddrüse' },
  { id: 'herz', name: 'Herz' },
  { id: 'lunge', name: 'Lunge' },
  { id: 'leber', name: 'Leber' },
  { id: 'magen', name: 'Magen' },
  { id: 'niere', name: 'Nieren' },
  { id: 'darm', name: 'Darm' },
];

// Positions are tuned by eye against the body illustration's viewBox below.
const MARKERS: Marker[] = [
  { organId: 'gehirn', top: 8.6, left: 50 },
  { organId: 'schilddruese', top: 15.5, left: 50 },
  { organId: 'herz', top: 25.5, left: 44 },
  { organId: 'lunge', top: 23.9, left: 57 },
  { organId: 'leber', top: 35.2, left: 41 },
  { organId: 'magen', top: 34.1, left: 60 },
  { organId: 'niere', top: 44.3, left: 39 },
  { organId: 'niere', top: 44.3, left: 61 },
  { organId: 'darm', top: 50, left: 50 },
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
        y2="228"
        stroke="var(--vitalis-gray-2)"
        strokeWidth="56"
        strokeLinecap="round"
      />
      <line x1="72" y1="90" x2="35" y2="190" stroke="var(--vitalis-gray-2)" strokeWidth="22" strokeLinecap="round" />
      <line x1="128" y1="90" x2="165" y2="190" stroke="var(--vitalis-gray-2)" strokeWidth="22" strokeLinecap="round" />
      <line x1="85" y1="228" x2="68" y2="420" stroke="var(--vitalis-gray-2)" strokeWidth="26" strokeLinecap="round" />
      <line x1="115" y1="228" x2="132" y2="420" stroke="var(--vitalis-gray-2)" strokeWidth="26" strokeLinecap="round" />
    </svg>
  );
}

export function BodyOrganMap() {
  const [selectedOrganId, setSelectedOrganId] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-[280px]" style={{ aspectRatio: '200 / 440' }}>
        <BodySilhouette />
        {MARKERS.map((marker, index) => (
          <button
            key={`${marker.organId}-${index}`}
            type="button"
            onClick={() => setSelectedOrganId(marker.organId)}
            style={{ top: `${marker.top}%`, left: `${marker.left}%` }}
            className="group absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow transition hover:scale-125 hover:bg-brand-deep focus:outline-none focus:ring-2 focus:ring-brand/50"
            aria-label={organName(marker.organId)}
          >
            <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {organName(marker.organId)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {ORGANS.map((organ) => (
          <button
            key={organ.id}
            type="button"
            onClick={() => setSelectedOrganId(organ.id)}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-brand hover:text-brand-deep"
          >
            {organ.name}
          </button>
        ))}
      </div>

      {selectedOrganId ? (
        <OrganSheet organName={organName(selectedOrganId)} onClose={() => setSelectedOrganId(null)} />
      ) : null}
    </div>
  );
}
