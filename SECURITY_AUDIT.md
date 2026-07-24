# Security-Audit — health-data-app

**Datum:** 2026-07-24
**Umfang:** Gesamtes Repository (Next.js 16 App Router + Supabase/Postgres + Gemini-API), Stand `main` @ `f5622ae`
**Methode:** Statische Code-Analyse (Frontend, API-Routen, Supabase-Migrationen/RLS, Config, `.env.local`, Git-Historie, `npm audit`). Kein Code verändert, keine neuen Dateien außer diesem Bericht.

---

## Zusammenfassung

| # | Kategorie | Status | Priorität |
|---|---|---|---|
| 1 | Secrets & Credentials | 🟡 Verbesserungswürdig | **Hoch** (Sofortmaßnahme: Rotation) |
| 2 | Authentifizierung | 🟢 In Ordnung | — |
| 3 | Autorisierung / Zugriffskontrolle | 🟢 In Ordnung | Niedrig |
| 4 | Input-Validierung & Injection | 🟡 Verbesserungswürdig | Niedrig |
| 5 | API-Sicherheit | 🟡 Verbesserungswürdig | Mittel |
| 6 | Abhängigkeiten | 🔴 Kritisch | **Hoch** |
| 7 | Datenverarbeitung & Datenschutz | 🟡 Verbesserungswürdig | Mittel |
| 8 | Infrastruktur & Deployment | 🟡 Verbesserungswürdig | Mittel |
| 9 | Sonstiges / Business-Logic | 🟡 Verbesserungswürdig | Niedrig |

---

## 1. Secrets & Credentials — 🟡 Verbesserungswürdig (Priorität: Hoch)

**Befund:**
- `.env.local` (Projekt-Root) enthält **echte, produktive Klartext-Credentials**: `SUPABASE_SERVICE_ROLE_KEY` (hebelt RLS vollständig aus), `GEMINI_API_KEY`, sowie ein `VERCEL_OIDC_TOKEN`.
- `.gitignore:34` (`.env*`, mit Ausnahme `.env.local.example`) verhindert korrekt, dass diese Datei eingecheckt wird. `git log --all` bestätigt: **`.env.local` wurde nie committet**, nur die anonymisierte `.env.local.example` ist im Repo (Zeile 1–23, ausschließlich Platzhalter).
- Im Frontend-Bundle sind ausschließlich `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` sichtbar ([supabaseBrowser.ts:20-21](src/app/lib/supabaseBrowser.ts#L20-L21)) — das ist bei Supabase by design so vorgesehen (Schutz läuft über RLS, nicht über Geheimhaltung des anon key). Service-Role-Key und Gemini-Key werden ausschließlich serverseitig referenziert ([supabaseServer.ts](src/app/lib/supabaseServer.ts), [geminiServer.ts](src/app/lib/geminiServer.ts)) und tauchen in keiner Client-Component auf.
- Keine hartkodierten Secrets im Quellcode gefunden (`grep` auf typische Key-Präfixe negativ).

**Sofortmaßnahme (unabhängig vom Code-Befund):** Da dieser Audit-Lauf den Inhalt von `.env.local` gelesen und in der Konversation angezeigt hat, sollten **`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` und `VERCEL_OIDC_TOKEN` aus Vorsicht rotiert werden** — insbesondere der Service-Role-Key, da er vollen, RLS-freien Lese-/Schreibzugriff auf sämtliche Nutzerdaten (inkl. Gesundheitsdaten) erlaubt.

**Für 🟢:**
- Rotation der oben genannten drei Schlüssel.
- Sicherstellen, dass `.env.local` nie in Screenshots/Logs/Tickets landet; ggf. einen Secret-Scanner (z. B. `gitleaks`) als Pre-Commit-Hook ergänzen, um zukünftige versehentliche Commits zu verhindern (aktuell rein `.gitignore`-basiert).

---

## 2. Authentifizierung — 🟢 In Ordnung

**Befund:**
- Passwort-Handling ist vollständig an **Supabase Auth (GoTrue)** delegiert (`client.auth.signUp` / `signInWithPassword` in [login/page.tsx:40-64](src/app/login/page.tsx#L40-L64)) — kein eigener Hashing-Code im Repo. Supabase hasht Passwörter serverseitig mit bcrypt/Argon2 und salted automatisch; das Projekt hat keinen Einfluss darauf und keine eigene Schwachstelle hier.
- Rate-Limiting gegen Brute-Force auf Login/Register liegt bei Supabase (GoTrue hat eingebautes Rate-Limiting pro IP/Email). Es gibt keinen zusätzlichen App-seitigen Schutz (z. B. Lockout nach n Versuchen), das ist aber für ein MVP mit Standard-Auth-Provider akzeptabel.
- Sessions werden über httpOnly-Cookies via `@supabase/ssr` verwaltet, nicht `localStorage` ([supabaseBrowser.ts:7-8](src/app/lib/supabaseBrowser.ts#L7-L8)). [proxy.ts](src/proxy.ts) refresht den Session-Cookie bei jedem Request und leitet nicht angemeldete Nutzer konsequent auf `/login` um (Zeile 45-49), angemeldete Nutzer werden von `/login` weg auf `/home` geleitet (Zeile 51-53). Token-Ablauf/Refresh übernimmt der Supabase-Client automatisch.
- API-Routen verifizieren das Bearer-Token bei **jedem** Request neu gegen Supabase (`supabase.auth.getUser(token)` in [apiAuth.ts:16](src/app/lib/apiAuth.ts#L16)) statt einer client-seitig behaupteten User-ID zu vertrauen — kein clientseitiges Session-Trust-Problem gefunden.

**Für 🟢 (bereits erreicht):** Keine Maßnahmen nötig. Optional: klientenseitiges Backoff/Captcha nach mehreren Fehlversuchen als zusätzliche UX-/Abuse-Bremse, ist aber nicht sicherheitskritisch, da Supabase serverseitig ratenlimitiert.

---

## 3. Autorisierung / Zugriffskontrolle — 🟢 In Ordnung (Priorität: Niedrig)

**Befund:**
- Sämtliche 12 API-Routen unter `src/app/api/**/route.ts` rufen konsequent `getAuthenticatedUserId(request, supabase)` auf und geben bei fehlendem/ungültigem Token `401` zurück — keine einzige Route ohne Auth-Check (verifiziert per Grep über alle `route.ts`).
- **Broken Object Level Authorization (BOLA) gezielt geprüft:** Alle mutierenden Endpunkte mit `:id`-Parameter filtern zusätzlich zur ID explizit nach `user_id`:
  - [body-checks/[id]/route.ts:46](src/app/api/body-checks/[id]/route.ts#L46): `.eq('id', id).eq('user_id', userId)`
  - [processes/[id]/route.ts:29](src/app/api/processes/[id]/route.ts#L29): dito
  - [recommended-tests/[id]/route.ts:24](src/app/api/recommended-tests/[id]/route.ts#L24): dito

  Ein User A kann über eine erratene/fremde ID **nicht** auf Datensätze von User B zugreifen oder sie verändern — der `UPDATE` betrifft schlicht 0 Zeilen, wenn `user_id` nicht passt (Supabase gibt dann einen Fehler wegen `.single()` auf leeres Ergebnis zurück statt fremde Daten preiszugeben).
  - Da die API mit dem **Service-Role-Key** arbeitet (RLS wird umgangen), ist diese explizite `user_id`-Filterung die einzige Zugriffskontrolle — sie ist aber konsistent und vollständig implementiert, inkl. Kommentar im Code, der genau dieses Risiko benennt ([apiAuth.ts:3-8](src/app/lib/apiAuth.ts#L3-L8)).
- **RLS als Verteidigungslinie:** Zusätzlich sind auf allen 10 Nutzdaten-Tabellen (`lab_results`, `analysis_uploads`, `pdf_extractions`, `body_checks`, `recommended_tests`, `processes`, `profiles`, u. a.) RLS-Policies mit `auth.uid() = user_id` aktiv (Migrationen 0002–0014). Das greift zwar nicht für die Service-Role-Verbindung, wäre aber ein Sicherheitsnetz, falls versehentlich der Anon-Key statt Service-Role-Key verwendet würde.
- **Admin-Routen:** Es existieren keine gesonderten Admin-Endpunkte im Repo — `DELETE /api/account` löscht ausschließlich die eigenen Daten des im Bearer-Token authentifizierten Nutzers ([account/route.ts:33-40](src/app/api/account/route.ts#L33-L40)), keine Möglichkeit, eine fremde `userId` zu übergeben.
- Kleinerer Fund: `getTabOverview`/`[tab]/page.tsx` fällt bei fehlender Session auf eine feste `DEMO_USER_ID` zurück ([[tab]/page.tsx:19](src/app/(app)/datenbank/diagnostik/[tab]/page.tsx#L19)). Diese Seite ist aber laut `proxy.ts`-Matcher bereits hinter dem Login-Gate (`PUBLIC_PATHS` enthält sie nicht), sodass der Demo-Fallback im aktuellen Routing nie unauthentifiziert erreichbar ist — toter Code aus der Vor-Auth-Phase, keine aktive Lücke, aber Aufräumkandidat.

**Für 🟢 (weitgehend erreicht):** Demo-User-Fallback in `[tab]/page.tsx` entfernen oder klar als Dev-only kennzeichnen, um zukünftige Verwirrung/Regressionen zu vermeiden, falls der Middleware-Matcher sich mal ändert.

---

## 4. Input-Validierung & Injection — 🟡 Verbesserungswürdig (Priorität: Niedrig)

**Befund:**
- **SQL/NoSQL-Injection:** Keine rohen SQL-Strings oder `.rpc()`/String-Konkatenation in Queries gefunden — durchgängig der parametrisierte `supabase-js` Query-Builder (`.eq()`, `.insert()`, etc.). Kein Injection-Vektor identifiziert.
- **XSS:** Kein `dangerouslySetInnerHTML`, kein `eval()`/`new Function()` im gesamten `src`-Baum. React escaped Text-Inhalte standardmäßig; keine ungefilterte Ausgabe von Nutzer-Content gefunden.
- **Serverseitige Validierung vorhanden für:**
  - PDF-Uploads: Größe (`MAX_UPLOAD_PDF_BYTES = 8MB`) und tatsächlicher Datei-Typ via Regex auf den Data-URL-Präfix (nicht nur Client-Extension) — [shared.ts:4-15](src/app/api/analysis-uploads/shared.ts#L4-L15).
  - Titel-/Notiz-Längen in `analysis-uploads` POST ([route.ts:76-81](src/app/api/analysis-uploads/route.ts#L76-L81)).
  - Profil: Geschlecht auf `'m'|'f'` und Geburtsdatum auf gültiges, nicht-zukünftiges Datum geprüft ([profile/route.ts:52-58](src/app/api/profile/route.ts#L52-L58)).
- **Lücken:**
  - `POST /api/lab-results` ([route.ts:32-38](src/app/api/lab-results/route.ts#L32-L38)) übernimmt `valueNumeric`/`valueQualitative`/`measuredAt` ungeprüft aus dem Body und reicht sie direkt an Supabase durch. Absicherung erfolgt nur implizit über DB-Constraints (`measured_at date not null`, FK auf `parameter_id`) — fehlerhafte Werte führen zu einem generischen `500`, nicht zu einer sprechenden `400`-Validierungsfehlermeldung. Da Zugriff nur auf eigene Zeilen möglich ist, ist das Risiko auf "eigene Daten kaputt machen" begrenzt, kein Cross-User-Impact.
  - `PATCH /api/processes/[id]` und `PATCH /api/recommended-tests/[id]` schreiben `body.status` ungeprüft in die DB — nur TypeScript-Typisierung (`ProcessStageStatus`), **kein Laufzeit-Check** gegen die erlaubten Enum-Werte (`offen`, `termin_gebucht`, `gemacht`, `resultat_erhalten`, `hochgeladen`). Ein manipulierter Request könnte einen beliebigen String als Status setzen und damit die eigene UI-Logik (Fortschrittsanzeige) durcheinanderbringen. Auch hier nur Selbstschädigung, keine Cross-User- oder Injection-Wirkung.

**Für 🟢:** Zod (oder vergleichbare Runtime-Validierung) für Request-Bodies ergänzen, insbesondere `status`-Enums und `lab-results`-Payload, um klare `400`-Antworten statt DB-Fehlern zu liefern.

---

## 5. API-Sicherheit — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befund:**
- **Authentifizierung:** Alle Endpunkte mit sensiblen Daten verlangen ein gültiges Bearer-Token (siehe Kategorie 3). `proxy.ts`-Matcher (Zeile 59) nimmt `/api` explizit von der Middleware aus — das ist beabsichtigt, da jede API-Route ihre eigene Auth-Prüfung hat, aber macht die App-Sicherheit vollständig abhängig davon, dass **jede** zukünftige neue Route diesen Check nicht vergisst (aktuell: alle tun es, aber es gibt keinen zentralen Erzwingungsmechanismus/Test dafür).
- **CORS:** Keine CORS-Konfiguration im Code gefunden (`grep` negativ) — Next.js liefert damit standardmäßig **keine** `Access-Control-Allow-Origin`-Header aus, Requests von fremden Origins werden also nicht explizit erlaubt. Kein offenes `*`-CORS-Risiko.
- **Rate-Limiting:** Nur `/api/analysis-uploads/extract` hat ein Limit (10 Gemini-Extraktionen/Tag/User, [extract/route.ts:11](src/app/api/analysis-uploads/extract/route.ts#L11)). Alle anderen schreibenden Endpunkte (`POST /api/analysis-uploads`, `POST /api/body-checks`, `POST /api/processes`, `POST /api/lab-results`, `PATCH`-Routen) haben **kein Rate-Limiting**. Ein einzelner authentifizierter Nutzer (oder ein gestohlenes Token) könnte z. B. beliebig viele 8-MB-PDF-Uploads (`analysis_uploads.file_data`, Base64 in der DB) oder `lab_results`-Zeilen erzeugen und so Datenbank-Speicher/-Kosten treiben (Denial-of-Wallet, kein klassisches DoS wegen Supabase-Limits, aber ein Kostenrisiko).

**Für 🟢:** Allgemeines Rate-Limiting auf Schreib-Endpunkten ergänzen (z. B. Upstash Ratelimit oder einfacher Zähler analog zum bestehenden `pdf_extractions`-Muster), insbesondere für den Datei-Upload-Endpunkt.

---

## 6. Abhängigkeiten (Dependencies) — 🔴 Kritisch (Priorität: Hoch)

**Befund (`npm audit`, Stand heute):**
- **3 High-Severity-Findings**, alle über `next@16.2.10` (aktuell in `package.json:11` gepinnt) eingeschleppt:
  - Next.js: *Middleware/Proxy bypass in App Router (Turbopack, single locale)* — [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) — **direkt relevant**, da `proxy.ts` genau der Middleware-basierte Auth-Gate-Mechanismus dieser App ist.
  - Next.js: *Unauthenticated disclosure of internal Server Function endpoints* — GHSA-955p-x3mx-jcvp
  - Next.js: *DoS in Server Actions*, *SSRF in Server Actions/Rewrites*, *Cache-Confusion (2×)*, *Unbounded Server Action payload*, *Image-Optimization-DoS via SVG*
  - Transitiv: `postcss` (<=8.5.11, XSS in CSS-Stringify + Arbitrary-File-Read via `sourceMappingURL`) und `sharp` (<0.35.0, mehrere libvips-CVEs 2026-333xx)
- Fix ist bereits verfügbar: `next@16.2.11` (per `npm audit fix --force` bzw. manuelles Anheben in `package.json`).
- **Positiv:** Die direkte Dependency-Liste ist bewusst schlank (6 Runtime-Packages: `@google/genai`, `@supabase/ssr`, `@supabase/supabase-js`, `next`, `react`, `react-dom`) — keine unnötigen/unbekannten Drittanbieter-Pakete, kleine Angriffsfläche.

**Für 🟢:** `next` auf ≥16.2.11 anheben (und danach `npm audit` erneut laufen lassen), besonders wegen des Middleware-Bypass-CVE, der direkt den Auth-Gate-Mechanismus dieser App betrifft. Der Proxy-bypass-Fund ist der Hauptgrund für die 🔴-Einstufung dieser Kategorie, nicht nur die Summe der CVEs.

---

## 7. Datenverarbeitung & Datenschutz — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befund:**
- **Transportverschlüsselung:** Supabase-Client und Gemini-SDK sprechen ausschließlich HTTPS-Endpunkte an (URLs beginnen mit `https://`). Ob die App selbst HTTP→HTTPS erzwingt, hängt vom Hosting ab (Vercel, siehe `.vercel/project.json`) — Vercel erzwingt HTTPS/HSTS für Custom Domains standardmäßig, im Code selbst ist aber kein expliziter Redirect/HSTS-Header konfiguriert (siehe auch Kategorie 8).
- **Datenverschlüsselung at rest:** Gesundheitsdaten (`lab_results`, `body_checks`, `analysis_uploads` inkl. hochgeladener PDFs als Base64 in `file_data`) liegen unverschlüsselt auf Anwendungsebene in Postgres — es wird auf Supabase's plattformseitige At-Rest-Verschlüsselung vertraut. Für ein Gesundheits-MVP mit expliziter Nutzereinwilligung (siehe Consent-Checkbox in [login/page.tsx:137-152](src/app/login/page.tsx#L137-L152)) ist das ein akzeptabler, aber dokumentationswürdiger Punkt.
- **DSGVO Art. 17 (Recht auf Löschung):** Sauber implementiert — `DELETE /api/account` löscht alle nutzerbezogenen Tabellen und danach den Auth-Account, mit Kommentar zur Unumkehrbarkeit ([account/route.ts:20-24](src/app/api/account/route.ts#L20-L24)).
- **Fehler-/Log-Ausgaben an den Client:** Sehr viele Routen geben `error.message` von Supabase direkt an den Client zurück, z. B. [analysis-uploads/route.ts:45](src/app/api/analysis-uploads/route.ts#L45), [body-checks/route.ts:45-48](src/app/api/body-checks/route.ts#L45-L48), [processes/route.ts:22](src/app/api/processes/route.ts#L22), [profile/route.ts:35](src/app/api/profile/route.ts#L35), u.v.m. (durchgängiges Muster). Postgres-/PostgREST-Fehlermeldungen können interne Details wie Spalten-/Tabellennamen oder Constraint-Namen enthalten und sickern so an den Browser durch. Kein Stack-Trace-Leak gefunden, aber ein konsistentes "Fehlermeldung 1:1 durchreichen"-Muster ohne Abstraktionsschicht.
- **Server-Logs:** `console.error` in der Gemini-Extraktionsroute loggt `userId` mit ([extract/route.ts:164,186-189](src/app/api/analysis-uploads/extract/route.ts#L164)) — das sind serverseitige Logs (nicht am Client sichtbar), unkritisch, aber falls Log-Aggregation eingerichtet wird, auf Zugriffsschutz der Logs achten (enthält User-IDs im Kontext von Gesundheitsdaten-Verarbeitung).

**Für 🟢:** Generische Fehlermeldungen an den Client (`"Serverfehler, bitte erneut versuchen"`), Rohdetails nur ins Server-Log; HSTS-Header explizit setzen (siehe Kategorie 8) statt sich allein auf Hosting-Defaults zu verlassen.

---

## 8. Infrastruktur & Deployment-Konfiguration — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befund:**
- **Debug-/Dev-Modi:** Kein expliziter Debug-Flag im Code (`next.config.ts` ist praktisch leer, [next.config.ts:3-6](next.config.ts#L3-L6)). Next.js deaktiviert Dev-spezifische Fehlerdetails automatisch im Production-Build (`next build`/`next start`). Keine Auffälligkeiten.
- **Datenbank-Erreichbarkeit:** Die App greift ausschließlich über die Supabase-HTTPS-API zu (`createSupabaseClient(url, key)` in [supabaseClient.ts](src/core/supabaseClient.ts) — nicht direkt auf einen Postgres-Port). Netzwerk-ACLs von Supabase selbst (z. B. ob Direct-DB-Connections/Port 5432 nach außen offen sind) sind nicht aus dem Repo einsehbar — das liegt im Supabase-Dashboard und war nicht Teil dieses Code-Audits.
- **Security-Header:** `next.config.ts` definiert **keine** eigenen HTTP-Security-Header — kein CSP, kein `Strict-Transport-Security`, kein `X-Frame-Options`/`frame-ancestors`, kein `X-Content-Type-Options`. Vercel setzt einige sinnvolle Defaults (z. B. HSTS für Custom Domains), aber CSP/X-Frame-Options fehlen vollständig, was bei einer App mit Login-Formular und Gesundheitsdaten (Clickjacking-Risiko auf `/login`) sinnvoll wäre.
- **`.vercel/`-Ordner:** Enthält nur `projectId`/`orgId`/`projectName` (keine Secrets) — unkritisch, aber Hinweis: `.vercel` steht korrekt in `.gitignore:31`.

**Für 🟢:** In `next.config.ts` einen `headers()`-Block ergänzen mit mindestens `Content-Security-Policy`, `X-Frame-Options: DENY` (oder `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.

---

## 9. Sonstiges / Business-Logic-Risiken — 🟡 Verbesserungswürdig (Priorität: Niedrig)

**Befund:**
- Kein Zahlungs-/Preis-Flow im Code — dieser Risikotyp entfällt größtenteils.
- Bereits unter Kategorie 4 genannt: fehlende Laufzeit-Validierung von `status`-Werten in den Prozess-/Test-Checklisten-PATCH-Routen erlaubt inkonsistente Zustände in den *eigenen* Daten des Nutzers (kein Cross-User-Impact, aber ein Datenintegritätsproblem).
- Tageslimit für Gemini-Extraktion (10/Tag) wird korrekt pro `user_id` gezählt ([extract/route.ts:94-108](src/app/api/analysis-uploads/extract/route.ts#L94-L108)) — kein Bypass ersichtlich, da `userId` serverseitig aus dem verifizierten Token stammt, nicht aus dem Request-Body.
- `recommended_tests`-Backfill-Logik ([recommended-tests/route.ts:46-70](src/app/api/recommended-tests/route.ts#L46-L70)) erzeugt Zeilen serverseitig anhand des gespeicherten `body_checks.biological_sex` — keine Möglichkeit für den Client, das zu manipulieren.

**Für 🟢:** Siehe Empfehlung in Kategorie 4 (Runtime-Validierung der Status-Enums).

---

## Priorisierte Handlungsliste

1. **Hoch:** `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VERCEL_OIDC_TOKEN` rotieren (Auslöser: dieser Audit hat sie gelesen/angezeigt).
2. **Hoch:** `next` von `16.2.10` auf `≥16.2.11` anheben (Middleware-Bypass-CVE betrifft direkt den Auth-Gate-Mechanismus dieser App), danach `npm audit` erneut prüfen.
3. **Mittel:** Rate-Limiting auf alle schreibenden API-Routen ausweiten (nicht nur `extract`).
4. **Mittel:** Generische Fehlermeldungen an Clients statt roher Supabase-`error.message`-Weitergabe.
5. **Mittel:** Security-Header (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) in `next.config.ts` ergänzen.
6. **Niedrig:** Runtime-Validierung (z. B. Zod) für `status`-Enums und `lab-results`-Payload ergänzen.
7. **Niedrig:** Toten `DEMO_USER_ID`-Fallback in `[tab]/page.tsx` entfernen oder als Dev-only markieren.
