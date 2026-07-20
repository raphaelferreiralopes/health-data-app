'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_NAV_ITEMS } from '@/app/lib/primaryNav';

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Hauptbereiche">
      {PRIMARY_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-pale text-brand-deep' : 'text-muted hover:bg-card hover:text-ink'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
