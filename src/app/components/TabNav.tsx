'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS } from '@/app/lib/tabs';

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 sm:px-6" aria-label="Datenkategorien">
      {TABS.map((tab) => {
        const href = `/datenbank/${tab.value}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.value}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-brand text-ink'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
