# DSGVO-Analyse — health-data-app

**Datum:** 2026-07-24
**Umfang:** Gesamtes Repository (Code, Migrationen, Config, Datenschutzseite). Reiner Analyse-Modus, keine Codeänderungen.

---

## ✅ Konforme Aspekte

**1. Einwilligungsmechanismus beim Signup (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a)**
Pflicht-Checkbox, nicht vorangehakt, blockiert das Absenden des Formulars ohne Häkchen, verlinkt auf die Datenschutzseite und benennt explizit "Gesundheitsdaten": [login/page.tsx:25-28](src/app/login/page.tsx#L25-L28), Text in [login/page.tsx:137-152](src/app/login/page.tsx#L137-L152). Für ein Opt-in nach Art. 7 sauber umgesetzt.

**2. Recht auf Löschung / "Vergessenwerden" (Art. 17)**
`DELETE /api/account` löscht konsequent alle personenbezogenen Tabellen (`lab_results`, `analysis_uploads`, `pdf_extractions`, `recommended_tests`, `processes`, `body_checks`, `profiles`) und danach den Auth-Account selbst: [account/route.ts:10-46](src/app/api/account/route.ts#L10-L46). Sofort, vollständig, nutzerseitig selbst auslösbar (kein Support-Ticket nötig).

**3. Zugriffskontrolle / Datenminimierung beim Zugriff (Art. 5 Abs. 1 lit. c, Art. 25)**
Jede API-Route filtert konsequent nach der eigenen `user_id` des Aufrufers, zusätzlich sind auf allen personenbezogenen Tabellen Row-Level-Security-Policies mit `auth.uid() = user_id` aktiv (Migrationen 0002–0014). Kein Nutzer kann auf Daten anderer Nutzer zugreifen.

**4. Transportverschlüsselung (Art. 32)**
Sämtliche Verbindungen (Browser↔App, App↔Supabase, App↔Gemini) laufen ausschließlich über HTTPS-Endpunkte.

**5. Passwort-Handling (Art. 32)**
Vollständig an Supabase Auth delegiert — kein eigenes, potenziell unsicheres Hashing im Code ([login/page.tsx:40-64](src/app/login/page.tsx#L40-L64)).

**6. Kein Tracking, keine Analytics-/Werbe-Cookies (Art. 5 Abs. 1 lit. c, ePrivacy-Richtlinie)**
Keine Analytics-, Ad- oder Social-Tracking-Skripte im gesamten Code oder in `package.json` gefunden. Einzige Cookies sind technisch notwendige Session-Cookies der Supabase-Auth (`@supabase/ssr`), gesetzt in [proxy.ts](src/proxy.ts) und [supabaseBrowser.ts](src/app/lib/supabaseBrowser.ts) — dafür ist nach Art. 5 Abs. 3 ePrivacy-RL kein Consent-Banner erforderlich, da diese Cookies für die Bereitstellung des angeforderten Dienstes (Login-Session) zwingend notwendig sind.

**7. Datenschutzerklärung vorhanden und im Kern zutreffend (Art. 12, 13)**
[datenschutz/page.tsx](src/app/datenschutz/page.tsx) benennt Verantwortlichen, verarbeitete Datenkategorien, Zweck, Rechtsgrundlage (inkl. Art. 9-Bezug), beide Auftragsverarbeiter (Supabase, Google/Gemini), Aufbewahrungsdauer und Betroffenenrechte. Deckt sich weitgehend mit dem tatsächlichen Code-Verhalten.

**8. Datenrichtigkeit / Human-in-the-loop bei automatisierter Auswertung (Art. 5 Abs. 1 lit. d)**
Von Gemini extrahierte Werte werden dem Nutzer erst zur Prüfung/Korrektur vorgelegt ([ExtractionReviewSheet.tsx](src/app/components/ExtractionReviewSheet.tsx)) und erst nach expliziter Bestätigung über einen separaten Endpunkt (`POST /api/lab-results`) gespeichert — keine automatische Übernahme ungeprüfter KI-Ausgaben.

**9. Sparsames Logging (Art. 5 Abs. 1 lit. c)**
Server-Logs enthalten nur pseudonyme `userId` + technische Metadaten (Token-Zahlen), keine Klartext-Gesundheitswerte oder Dokumenteninhalte ([extract/route.ts](src/app/api/analysis-uploads/extract/route.ts), [apiError.ts](src/app/lib/apiError.ts)).

---

## ⚠️ Kritische / unklare Punkte

**1. Internationale Übermittlung von Gesundheitsdaten an Google Gemini (Art. 9, Art. 28, Art. 44–49) — höchste Priorität**
Die PDF-Extraktion sendet das **vollständige Original-Dokument** (Laborbericht, ggf. mit Name/Adresse/Geburtsdatum im Kopfbereich) inklusive Gesundheitsdaten an die Google-Gemini-API in den USA ([extract/route.ts:123-154](src/app/api/analysis-uploads/extract/route.ts#L123-L154)). Aus Commit-Historie und `.env.local.example` geht hervor, dass die **kostenlose Gemini-API (Google AI Studio)** verwendet wird, nicht die Enterprise-Variante (Vertex AI) mit regulärem Auftragsverarbeitungsvertrag. Der kostenlose Google-AI-Studio-Tarif erlaubt Google nach dessen Standard-Nutzungsbedingungen typischerweise die Nutzung übermittelter Inhalte zur Produktverbesserung (inkl. menschlicher Durchsicht), sofern nicht vertraglich ausgeschlossen. Im Code findet sich kein Hinweis auf ein entsprechendes Opt-out oder eine Enterprise-Vereinbarung. Bei Gesundheitsdaten (Art. 9) ist das ein erhebliches, rechtlich zu klärendes Risiko — betrifft Art. 28 Abs. 3 (Auftragsverarbeitungsvertrag), Art. 9 Abs. 2 (angemessene Garantien) und Art. 44 ff. (Drittlandtransfer USA).

**2. Fehlender Hinweis auf Drittlandtransfer in der Datenschutzerklärung (Art. 13 Abs. 1 lit. f)**
[datenschutz/page.tsx:49-63](src/app/datenschutz/page.tsx#L49-L63) benennt Google als Auftragsverarbeiter, informiert aber nicht darüber, dass dabei eine Übermittlung in ein Drittland (USA) stattfindet, noch über das Vorliegen (oder Fehlen) von Garantien wie Standardvertragsklauseln. Formal eine unvollständige Informationspflicht.

**3. Reichweite der erteilten Einwilligung unklar**
Die Signup-Checkbox spricht wörtlich nur von "gespeichert" ([login/page.tsx:149](src/app/login/page.tsx#L149)), nicht explizit von einer Übermittlung an einen externen KI-Dienst zur automatisierten Auswertung. Der spätere, separate Klick auf "Werte automatisch auslesen" mildert das etwas (situativer Hinweis zum Zeitpunkt der Handlung), ersetzt aber möglicherweise nicht eine hinreichend spezifische Einwilligung nach Art. 9 Abs. 2 lit. a für diesen konkreten Verarbeitungsvorgang.

**4. Vollständiges Dokument statt minimierter Daten an Dritte (Art. 5 Abs. 1 lit. c, Art. 25)**
Es wird das gesamte PDF an Gemini geschickt, nicht etwa vorab anonymisierte/geschwärzte Inhalte — Datenminimierung "by Default" ist hier nicht umgesetzt, obwohl der Verarbeitungszweck (Werte-Extraktion) grundsätzlich auch mit reduzierten Daten erreichbar wäre.

**5. Kein Berichtigungs-/Teil-Löschmechanismus für einzelne Laborwerte (Art. 16, teilweise Art. 17)**
`POST /api/lab-results` erlaubt nur das Anlegen neuer Einträge; es existiert kein PATCH/DELETE für einzelne `lab_results`-Zeilen ([lab-results/route.ts](src/app/api/lab-results/route.ts)). Ein Nutzer, der einen fehlerhaften Wert korrigieren oder einzeln löschen möchte (z. B. Tippfehler), kann das nur durch vollständige Kontolöschung erreichen — keine granulare Berichtigungsmöglichkeit.

**6. Gesundheitsdaten Dritter über die Familienanamnese (Art. 9, Art. 14)**
Der Ganz-Körper-Check fragt detaillierte Krankheitsgeschichten von Eltern/Geschwistern/Verwandten ab ([familyHistoryQuestionnaire.ts](src/core/familyHistoryQuestionnaire.ts), z. B. Krebs-, Demenz-, psychiatrische Erkrankungen) und speichert sie im `body_checks.family_history`-Feld — verknüpft mit dem einwilligenden Nutzer, nicht mit den betroffenen Angehörigen selbst. Das sind Gesundheitsdaten identifizierbarer Dritter, die diese nie selbst eingewilligt haben; ob und welche Ausnahme von der Informationspflicht nach Art. 14 (z. B. Abs. 5 lit. b, unverhältnismäßiger Aufwand) hier greift, ist eine rechtlich nicht triviale Einzelfallfrage.

**7. Supabase-Hosting-Region nicht aus dem Code ersichtlich (Art. 44 ff.)**
Falls die Datenbank außerhalb EU/EWR gehostet ist, gelten dieselben Drittlandtransfer-Anforderungen wie bei Google. Aus dem Repository nicht verifizierbar (Projekt-URL verrät keine Region) — reine Config-/Vertragsfrage außerhalb des Codes.

**8. Verwaiste `waitlist_emails`-Tabelle ohne erkennbare Rechtsgrundlage in diesem Repository**
Migration 0012 legt Schema + RLS für anonyme E-Mail-Erfassung an, laut SQL-Kommentar für eine separat gehostete Landingpage gedacht — im aktuellen App-Code gibt es aber kein Formular/keinen Endpoint, der diese Tabelle befüllt. Falls dasselbe Supabase-Projekt von jener externen Landingpage mitgenutzt wird, ist unklar, wer für diese Daten "Verantwortlicher" ist und ob dafür eine eigene Datenschutzerklärung/Löschregel existiert — außerhalb der Sichtbarkeit dieses Repos.

**9. Keine automatische Löschung inaktiver Konten (Art. 5 Abs. 1 lit. e)**
Löschung erfolgt ausschließlich aktiv durch den Nutzer selbst; es gibt keine Verfallsregel für dauerhaft inaktive Test-Accounts. Für ein "kleines privates Beta" nachvollziehbar, aber eine bewusst zu dokumentierende/zeitlich zu befristende Design-Entscheidung.

**10. Verschlüsselung "at rest" nicht auf Anwendungsebene, sondern reines Plattform-Vertrauen (Art. 32)**
Gesundheitsdaten liegen unverschlüsselt auf Anwendungsebene in Postgres; es wird ausschließlich auf Supabases plattformseitige Speicherverschlüsselung vertraut, ohne eigene Verifizierung oder zusätzliche Verschlüsselung besonders sensibler Felder.

**11. `pdf_extractions`-Protokollierung ohne gesondert ausgewiesenen Zweck in der Datenschutzerklärung (Art. 13 Abs. 1 lit. c)**
Tabelle speichert `userId` + Token-Zahlen dauerhaft (bis Kontolöschung) zu Rate-Limiting-Zwecken — technisch nachvollziehbar, aber in der Datenschutzerklärung nicht als eigener Verarbeitungszweck genannt.

---

## ❌ Nicht konforme Aspekte

**1. Unvollständige Informationspflicht zum Drittlandtransfer — Art. 13 Abs. 1 lit. f DSGVO**
Formal ein Verstoß: Es findet nachweislich eine Datenübermittlung in ein Drittland (USA, Google) statt, die Datenschutzerklärung informiert die betroffene Person aber nicht über diesen Umstand noch über das Bestehen oder Fehlen geeigneter Garantien. Dies ist direkt aus dem Code/Content des Repositories verifizierbar (siehe ⚠️-Punkt 2) und lässt sich unabhängig von externen Vertragsdetails feststellen.

**2. Fehlende Anbieterkennzeichnung / unvollständige Kontaktdaten des Verantwortlichen — angrenzend an Art. 13 Abs. 1 lit. a**
Als Kontakt wird ausschließlich eine E-Mail-Adresse genannt ([datenschutz/page.tsx:22-27](src/app/datenschutz/page.tsx#L22-L27)), keine Postanschrift. Für eine öffentlich erreichbare Webanwendung mit Registrierung ist das nach deutschem Telemedien-/Digitale-Dienste-Recht (kein DSGVO-Artikel, aber eng verknüpft mit den Kontaktangaben-Pflichten aus Art. 13) typischerweise unzureichend; ein separates Impressum fehlt vollständig im Projekt.

---

## 📋 Zusammenfassung / Gesamteinschätzung

Das Projekt zeigt an vielen Stellen ein überdurchschnittlich datenschutzbewusstes Fundament für ein MVP: konsequente Zugriffskontrolle, sauberes Löschkonzept, sparsames Logging, keinerlei Tracking, eine inhaltlich fundierte Datenschutzerklärung mit korrektem Art.-9-Bezug. Das ist deutlich mehr, als man bei einem "kleinen privaten Beta" erwarten würde.

Der entscheidende Risikotreiber ist die **Übermittlung von Gesundheitsdaten an die kostenlose Gemini-API** ohne erkennbare Enterprise-/DPA-Absicherung, kombiniert mit dem fehlenden Drittlandtransfer-Hinweis in der Datenschutzerklärung. Das betrifft die sensibelste Datenkategorie der DSGVO (Art. 9) und ist der Punkt, der vor einem Ausrollen über den aktuellen "kleinen Testkreis" hinaus zwingend rechtlich/vertraglich geklärt werden sollte (Wechsel auf eine Enterprise-API mit AVV, oder Bestätigung, dass die bestehenden Google-Bedingungen für diesen Anwendungsfall ausreichen).

**Risikoeinstufung: Mittel bis Hoch** — getrieben im Wesentlichen durch einen einzigen, aber gewichtigen Punkt (Drittanbieter-KI-Verarbeitung von Gesundheitsdaten ohne belegte Garantien), umgeben von einer ansonsten soliden Datenschutz-Grundstruktur. Für den aktuellen Status ("privater Beta-Test mit kleinem Nutzerkreis", wie die Datenschutzseite selbst einordnet) vertretbar; vor einem größeren/öffentlichen Rollout sollte insbesondere Punkt 1 der kritischen Befunde rechtlich geprüft werden.
