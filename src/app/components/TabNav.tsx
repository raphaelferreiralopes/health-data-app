'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS } from '@/app/lib/tabs';

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-6" aria-label="Datenkategorien">
      {TABS.map((tab) => {
        const href = `/${tab.value}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.value}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
