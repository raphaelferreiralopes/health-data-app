import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogArticleBySlug } from '@/core/blogArticles';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/longevity-hub" className="text-sm font-medium text-muted hover:text-ink">
        ← Zurück zum Longevity Hub
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
        <span className="inline-flex items-center rounded-full bg-brand-pale px-2.5 py-1 text-brand-deep">{article.tag}</span>
        <span>{formatDate(article.publishedAt)}</span>
        <span>·</span>
        <span>{article.readMinutes} Min. Lesezeit</span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{article.title}</h1>

      <div className="mt-8 flex flex-col gap-4">
        {article.content.map((block, index) => {
          if (block.type === 'h2') {
            return (
              <h2 key={index} className="mt-2 text-lg font-semibold text-ink">
                {block.text}
              </h2>
            );
          }
          if (block.type === 'list') {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 text-sm text-ink">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className="text-sm leading-relaxed text-ink">
              {block.text}
            </p>
          );
        })}
      </div>
    </main>
  );
}
