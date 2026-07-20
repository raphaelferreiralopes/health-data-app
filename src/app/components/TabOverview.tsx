'use client';

import { useState } from 'react';
import type { CategoryOverview, ParameterWithResult } from '@/core/types';
import { CategorySection } from './CategorySection';
import { ParameterDetailSheet } from './ParameterDetailSheet';

export function TabOverview({ categories, emptyLabel }: { categories: CategoryOverview[]; emptyLabel: string }) {
  const [selected, setSelected] = useState<ParameterWithResult | null>(null);

  if (categories.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <>
      {categories.map((categoryOverview) => (
        <CategorySection key={categoryOverview.category.id} categoryOverview={categoryOverview} onSelectParameter={setSelected} />
      ))}
      {selected && <ParameterDetailSheet pw={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
