'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS } from '@/app/lib/tabs';
import type { Tab } from '@/core/types';

export function TabNav({ visibleTabs }: { visibleTabs: Tab[] }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => visibleTabs.includes(tab.value));

  return (
    <nav className="border-b border-line" aria-label="Datenkategorien">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const href = `/datenbank/diagnostik/${tab.value}`;
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
      </div>
    </nav>
  );
}
