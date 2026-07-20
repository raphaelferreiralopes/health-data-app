import type { CategoryOverview, ParameterWithResult } from '@/core/types';
import { ParameterCard } from './ParameterCard';

export function CategorySection({
  categoryOverview,
  onSelectParameter,
}: {
  categoryOverview: CategoryOverview;
  onSelectParameter: (pw: ParameterWithResult) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-medium tracking-tight text-ink">{categoryOverview.category.name}</h2>
      <div className="flex flex-col gap-5">
        {categoryOverview.subcategories.map((sub) => (
          <div key={sub.subcategory.id}>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">{sub.subcategory.name}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sub.parameters.map((pw) => (
                <ParameterCard key={pw.parameter.id} pw={pw} onSelect={onSelectParameter} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
