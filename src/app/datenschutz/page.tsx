export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-light tracking-tight text-ink">Datenschutz &amp; Hinweise zum Beta-Test</h1>
      <p className="mt-2 text-sm text-muted">
        longevitystack befindet sich aktuell in einem privaten Test mit einem kleinen Kreis von Nutzer:innen. Dieser Hinweis
        beschreibt, welche Daten dabei verarbeitet werden -- er ersetzt keine anwaltliche Prüfung und wird vor einem öffentlichen
        Launch überarbeitet.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Wichtiger medizinischer Hinweis</h2>
        <p className="mt-2 text-sm text-ink">
          longevitystack liefert keine Diagnose, keine Therapieempfehlung und ersetzt keine ärztliche Beratung. Alle Inhalte
          (z. B. empfohlene Tests, Vorsorge-Fahrplan, Longevity-Hub-Artikel) dienen der allgemeinen Information. Bei
          gesundheitlichen Beschwerden oder Fragen zu deinen Werten wende dich bitte an eine Ärztin oder einen Arzt.
        </p>
      </section>

      <section className="mt-6 flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-ink">Verantwortlich</h2>
          <p className="mt-2 text-sm text-muted">
            Raphael Ferreira Lopes
            <br />
            Kontakt: ferreiralopesraphael@gmail.com
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Welche Daten wir speichern</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Kontodaten: E-Mail-Adresse, Name (falls angegeben)</li>
            <li>Gesundheitsdaten, die du selbst einträgst: Laborwerte, Körpermaße, Familienanamnese, Prozess-Status</li>
            <li>Von dir hochgeladene Dokumente (z. B. Laborberichte, Arztdokumente)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Warum wir sie verarbeiten</h2>
          <p className="mt-2 text-sm text-muted">
            Ausschließlich, um dir die Funktionen der App bereitzustellen -- also deine eigenen Werte anzuzeigen, deinen
            Vorsorge-Fahrplan zu verfolgen und hochgeladene Dokumente optional automatisiert auszulesen. Rechtsgrundlage ist
            deine Einwilligung (Art. 6 Abs. 1 lit. a i. V. m. Art. 9 Abs. 2 lit. a DSGVO, da es sich um Gesundheitsdaten
            handelt).
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Wer die Daten sonst noch sieht</h2>
          <p className="mt-2 text-sm text-muted">
            Zwei Auftragsverarbeiter, technisch notwendig für den Betrieb der App:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>
              <strong className="text-ink">Supabase</strong> -- Hosting von Datenbank, Datei-Uploads und Login.
            </li>
            <li>
              <strong className="text-ink">Google (Gemini API)</strong> -- nur wenn du aktiv &bdquo;Werte automatisch auslesen&ldquo; nutzt,
              wird das jeweilige Dokument zur Auswertung an die Gemini-API geschickt.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Wie lange</h2>
          <p className="mt-2 text-sm text-muted">
            Bis du dein Konto löschst oder uns bittest, es zu löschen. Ein &bdquo;Konto löschen&ldquo; findest du oben rechts in
            der App -- das entfernt sofort und unwiderruflich alle deine Daten.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">Deine Rechte</h2>
          <p className="mt-2 text-sm text-muted">
            Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Widerspruch -- schreib uns dafür einfach an
            die oben genannte Kontaktadresse. Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren.
          </p>
        </div>
      </section>
    </main>
  );
}
