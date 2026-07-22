import Link from 'next/link';
import { BLOG_ARTICLES } from '@/core/blogArticles';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LongevityHubPage() {
  const articles = [...BLOG_ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-light tracking-tight text-ink">Longevity Hub</h1>
      <p className="mt-2 text-sm text-muted">Wissen rund um ein langes, gesundes Leben.</p>

      <div className="mt-8 flex flex-col gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/longevity-hub/${article.slug}`}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-md sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <span className="inline-flex items-center rounded-full bg-brand-pale px-2.5 py-1 text-brand-deep">{article.tag}</span>
              <span>{formatDate(article.publishedAt)}</span>
              <span>·</span>
              <span>{article.readMinutes} Min. Lesezeit</span>
            </div>
            <h2 className="text-lg font-semibold text-ink">{article.title}</h2>
            <p className="text-sm text-muted">{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
