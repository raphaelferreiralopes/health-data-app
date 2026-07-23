'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DATENBANK_SECTIONS } from '@/app/lib/datenbankSections';

export function DatenbankSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-5xl px-4 pb-3 pt-4 sm:px-6" aria-label="Datenbank-Bereiche">
      <div className="inline-flex gap-1 rounded-xl bg-card p-1">
        {DATENBANK_SECTIONS.map((section) => {
          const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.value}
              href={section.href}
              className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
