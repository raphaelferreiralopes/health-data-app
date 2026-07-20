export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-light tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm text-muted">{description}</p>
      </div>
    </main>
  );
}
