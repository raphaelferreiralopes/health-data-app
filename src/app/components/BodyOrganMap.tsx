'use client';

import { useState } from 'react';
import { OrganSheet } from './OrganSheet';
import { MARKERS, SYSTEMS, organName } from './biomarkerMapData';

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
        <OrganSheet organId={selectedOrganId} onClose={() => setSelectedOrganId(null)} />
      ) : null}
    </div>
  );
}
