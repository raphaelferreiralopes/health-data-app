export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-light tracking-tight text-ink">Impressum</h1>
      <p className="mt-2 text-sm text-muted">Angaben gemäß § 5 DDG.</p>

      <section className="mt-6 flex flex-col gap-6">
        <div>
          <p className="text-sm text-muted">
            Raphael Ferreira Lopes
            <br />
            D&apos;Esterstraße 3
            <br />
            56179 Vallendar
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Kontakt</h2>
          <p className="mt-2 text-sm text-muted">E-Mail: ferreiralopesraphael@gmail.com</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p className="mt-2 text-sm text-muted">
            Raphael Ferreira Lopes
            <br />
            D&apos;Esterstraße 3, 56179 Vallendar
          </p>
        </div>

        <div>
          <p className="text-sm text-muted">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für
            den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </div>
      </section>
    </main>
  );
}
