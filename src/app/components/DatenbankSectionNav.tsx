'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DATENBANK_SECTIONS } from '@/app/lib/datenbankSections';

export function DatenbankSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 sm:px-6" aria-label="Datenbank-Bereiche">
      {DATENBANK_SECTIONS.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.value}
            href={section.href}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              isActive ? 'border-brand text-ink' : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
