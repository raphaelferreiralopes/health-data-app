# Security-Audit — health-data-app

**Datum:** 2026-07-25
**Umfang:** Gesamtes Repository (Frontend, API-Routen, Datenbank-Migrationen, Config, `.env`-Handling, Dependencies, Git-Historie). Reiner Analyse-Modus, keine Codeänderungen.
**Methode:** Vollständige Durchsicht aller `src/app/api/*`-Routen, aller `supabase/migrations/*.sql`, `next.config.ts`, `src/proxy.ts`, `src/app/lib/*`, Git-Historie (`git log --all` auf `.env*`), `npm audit`, gezielte Greps auf gefährliche Muster (`eval`, `dangerouslySetInnerHTML`, `.rpc(`, hartkodierte Keys, CORS-Header).

> **Ersetzt** die vorherige Version dieses Berichts vom 2026-07-24 (Stand `main` @ `f5622ae`). Seitdem wurde am Code gearbeitet; ein Großteil der damaligen Befunde ist inzwischen behoben (Details unten unter "Seit dem letzten Audit behoben"). Diese Version spiegelt den aktuellen Stand (`main` @ `25d19b2` und danach) und ersetzt die alten Bewertungen, statt sie fortzuschreiben.

Es existiert außerdem ein `DSGVO_AUDIT.md` (2026-07-24) mit Fokus auf Datenschutzrecht statt Technik. Dieses Audit ist technisch/sicherheitsfokussiert; inhaltliche Überschneidungen sind mit Bezug auf dessen Bearbeitungsstand vermerkt.

---

## Seit dem letzten Audit (2026-07-24) behoben

Zur Einordnung, damit alte und neue Befunde nicht doppelt auftauchen:

- ✅ Next.js war auf `16.2.10` gepinnt (Middleware-Bypass-CVE); jetzt `16.2.11` — aktuell die neueste stabile Version.
- ✅ Generelles Rate-Limiting auf schreibenden Endpunkten ergänzt (`src/app/lib/rateLimit.ts`, in fast allen POST-Routen verwendet — siehe Kategorie 5 für die verbleibende Lücke bei PATCH/DELETE).
- ✅ Generische Fehlermeldungen an den Client statt roher Supabase-`error.message`-Weitergabe (`src/app/lib/apiError.ts`, durchgängig verwendet).
- ✅ Security-Header ergänzt (`next.config.ts`): CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- ✅ Laufzeit-Validierung von Status-Enums ergänzt (`isProcessStageStatus`, analog für Medikamente/Kategorien).
- ✅ Der als "toter Code" markierte `DEMO_USER_ID`-Fallback in `[tab]/page.tsx` ist inzwischen umgebaut: Die Seite redirectet jetzt hart auf `/login`, wenn keine Session vorliegt; ein Default-Profil (`DEFAULT_PROFILE`) wird nur noch als Demografie-Platzhalter für angemeldete Nutzer ohne ausgefülltes Profil verwendet, nicht mehr als Auth-Fallback.
- ✅ Rotation von `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` und `VERCEL_OIDC_TOKEN` ist laut Nutzerangabe (2026-07-25) erfolgt. Aus dem Code heraus nicht unabhängig verifizierbar, aber als erledigt vermerkt.

---

## Update 2026-07-25 — im Laufe dieses Audits behoben

Der unten unter Kategorie 7 beschriebene Hauptbefund (unvollständige Account-Löschung) wurde noch am selben Tag gefixt, direkt im Anschluss an diesen Audit-Lauf:

- ✅ `medications` und `medication_intake_logs` sind jetzt Teil von `USER_DATA_TABLES` in [src/app/api/account/route.ts](src/app/api/account/route.ts) (Commit `d6ad460`). "Konto löschen" entfernt damit wieder wirklich alle Daten, wie in der Datenschutzerklärung zugesagt.

Die Detailbeschreibung unter Kategorie 7 bleibt unten stehen (inkl. Code-Referenzen), ist aber als **behoben** markiert statt entfernt, damit der Bericht nachvollziehbar bleibt.

---

## Zusammenfassung

| # | Kategorie | Status | Priorität |
|---|---|---|---|
| 1 | Secrets & Credentials | 🟢 In Ordnung | Niedrig |
| 2 | Authentifizierung | 🟡 Verbesserungswürdig | Mittel |
| 3 | Autorisierung / Zugriffskontrolle | 🟢 In Ordnung | Niedrig |
| 4 | Input-Validierung & Injection | 🟡 Verbesserungswürdig | Mittel |
| 5 | API-Sicherheit | 🟡 Verbesserungswürdig | Mittel |
| 6 | Abhängigkeiten (Dependencies) | 🟡 Verbesserungswürdig | Mittel |
| 7 | Datenverarbeitung & Datenschutz | 🟢 In Ordnung *(war 🔴, behoben am 2026-07-25)* | Niedrig |
| 8 | Infrastruktur & Deployment-Konfiguration | 🟡 Verbesserungswürdig | Mittel |
| 9 | Business-Logic-Risiken | 🟢 In Ordnung | Niedrig |

**Größter Einzelbefund — behoben am 2026-07-25:** Die Account-Löschung war unvollständig (Kategorie 7) — die neuen Tabellen `medications` und `medication_intake_logs` fehlten in der Lösch-Routine, wodurch Gesundheitsdaten nach "Konto löschen" entgegen der expliziten Zusage in der Datenschutzerklärung erhalten geblieben wären. Noch am selben Tag gefixt (Commit `d6ad460`).

---

## 1. Secrets & Credentials — 🟢 In Ordnung (Priorität: Niedrig)

**Befunde:**
- Keine hartkodierten API-Keys, Passwörter oder Tokens im Code gefunden (Grep auf `sk-`, `AIza`, `PRIVATE KEY`, `service_role=`, etc. — keine Treffer).
- `SUPABASE_SERVICE_ROLE_KEY` und `GEMINI_API_KEY` werden ausschließlich über `process.env` in zwei dedizierten Server-only-Dateien gelesen: [src/app/lib/supabaseServer.ts:12](src/app/lib/supabaseServer.ts#L12), [src/app/lib/geminiServer.ts:8](src/app/lib/geminiServer.ts#L8). Beide werden nachweislich nur von API-Routen bzw. einer Server-Component importiert, nie von einer `'use client'`-Datei (per Grep über alle Importer verifiziert).
- Verifiziert: In `.next/static/` (dem öffentlich ausgelieferten Client-Bundle) taucht keiner der beiden Variablennamen auf — die Secrets landen nicht im Frontend-Bundle.
- `.gitignore` schließt `.env*` korrekt aus (mit expliziter Ausnahme für `.env.local.example`).
- Git-Historie geprüft (`git log --all --diff-filter=A -- '.env*'`, `git rev-list --objects --all | grep env`): Es wurde nie eine echte `.env`-Datei committed, nur die Vorlage `.env.local.example` mit Platzhaltern (`xxxxxxxxxxxx`).
- `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` sind bewusst öffentlich (by design bei Supabase, RLS schützt dahinter) — korrekt kommentiert in `.env.local.example`.
- Rotation der zuvor im Chat sichtbaren Keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VERCEL_OIDC_TOKEN`) ist laut Nutzerangabe (2026-07-25) erfolgt. Aus dem Code heraus nicht unabhängig verifizierbar, aber als erledigt vermerkt.

**Was für 🟢 nötig wäre:** Bereits erreicht. Perspektivisch optional: ein Secret-Scanning-Tool (z. B. `gitleaks`) in einer CI-Pipeline ergänzen (siehe Kategorie 8), um zukünftige versehentliche Commits automatisch zu verhindern.

---

## 2. Authentifizierung — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befunde:**
- **Passwort-Speicherung:** Vollständig an Supabase Auth (GoTrue) delegiert — kein eigener Hashing-Code im Repo. Supabase nutzt bcrypt intern; das ist Industriestandard. 🟢
- **Rate-Limiting gegen Brute-Force:** `client.auth.signInWithPassword()` und `client.auth.signUp()` in [src/app/login/page.tsx:63,42](src/app/login/page.tsx#L63) laufen direkt vom Browser gegen die Supabase-Auth-API — **nicht** über eine eigene Next.js-API-Route. Das im Repo vorhandene Rate-Limiting (`src/app/lib/rateLimit.ts`) greift hier also nicht; Schutz vor Credential-Stuffing/Brute-Force hängt vollständig von Supabase-seitigen, projektspezifischen Einstellungen ab (Dashboard → Auth → Rate Limits, CAPTCHA-Integration), die aus dem Code heraus nicht verifizierbar sind.
- Kein clientseitiges `minLength`/Stärke-Constraint auf dem Passwort-Feld ([src/app/login/page.tsx:131-137](src/app/login/page.tsx#L131-L137)) — verlässt sich komplett auf Supabase's Default (i. d. R. 6 Zeichen Minimum, im Dashboard konfigurierbar).
- **Session-/Token-Verwaltung:** Cookie-basiert über `@supabase/ssr`, automatisches Refresh in [src/proxy.ts](src/proxy.ts) bei jedem Request. Recherche im installierten Package (`node_modules/@supabase/ssr/dist/main/cookies.js`) ergab: Die Bibliothek erzwingt bei **jedem** Cookie-Schreibvorgang `maxAge` auf ihren eigenen Default von 400 Tagen — unabhängig davon, welche `cookieOptions` die App übergibt. Ein echtes kurzlebiges Session-Cookie ist über die öffentliche API der Bibliothek nicht erreichbar.
  - Die App kompensiert das mit einer eigenen "Angemeldet bleiben"-Logik ([src/app/lib/rememberMe.ts](src/app/lib/rememberMe.ts)), die bei abgewählter Checkbox einen erzwungenen Sign-out nach Browser-Neustart durchsetzt (App-Ebene statt Cookie-Ebene). Sauber dokumentierter, bewusster Workaround. 🟢 für diesen Teilaspekt.
  - `signOut()` wird ohne explizites `scope` aufgerufen ([src/app/components/AuthGate.tsx:70,115,145](src/app/components/AuthGate.tsx#L70)) → Default `'global'` in supabase-js v2, widerruft den Refresh-Token serverseitig. Korrekt.
- Keine Account-Lockout-Mechanik nach X Fehlversuchen im eigenen Code (liegt, s. o., bei Supabase).

**Was noch zu tun wäre:**
- Im Supabase-Dashboard verifizieren/konfigurieren: Auth-Rate-Limits, ggf. CAPTCHA (hCaptcha/Turnstile-Integration von Supabase Auth) für Login/Signup aktivieren.
- Mindest-Passwortlänge/-komplexität im Supabase-Dashboard bewusst setzen (nicht nur Default vertrauen) und im Frontend spiegeln (`minLength`, Hinweistext).

---

## 3. Autorisierung / Zugriffskontrolle — 🟢 In Ordnung (Priorität: Niedrig)

**Befunde:**
- Systematisch geprüft: **alle 15 API-Routen** unter `src/app/api/**/route.ts` rufen `getAuthenticatedUserId(request, supabase)` auf ([src/app/lib/apiAuth.ts](src/app/lib/apiAuth.ts)), das die User-ID ausschließlich aus dem verifizierten Bearer-Token zieht (`supabase.auth.getUser(token)`) — nie aus einem client-gelieferten Feld. Bei fehlendem/ungültigem Token: `401`.
- **Broken Object Level Authorization gezielt geprüft:** Jede Route mit `[id]`-Parameter (`medications/[id]`, `lab-results/[id]`, `processes/[id]`, `body-checks/[id]`, `recommended-tests/[id]`) kombiniert `.eq('id', id)` **immer** zusätzlich mit `.eq('user_id', userId)` vor UPDATE/DELETE — verifiziert per Grep über alle Dateien, keine Ausnahme gefunden. User A kann also nicht über eine erratene/manipulierte ID auf Datensätze von User B zugreifen.
- Row-Level-Security ist auf **100 % der Tabellen** aktiviert (15/15 in den Migrationen erstellten Tabellen haben eine passende `enable row level security`-Zeile — per Skript gegengecheckt). Da der Server ausschließlich mit dem Service-Role-Key arbeitet (bypasst RLS), ist die eigentliche Durchsetzung die o. g. explizite `user_id`-Filterung im Code; RLS ist hier zusätzliche Verteidigungsebene für den Fall, dass künftig doch einmal direkt mit Anon-Key aus dem Client gegen die DB gequeried wird. Verifiziert: Der Browser-Client (`getBrowserSupabaseClient()`) wird aktuell **nirgends** für direkte Tabellen-Queries verwendet, nur für `auth.*`-Aufrufe — die gesamte Datenzugriffs-Logik läuft über die Next.js-API-Schicht.
- Keine Admin-Routen/Admin-UI im Repo vorhanden — kein separates Absicherungsproblem in dieser Hinsicht.
- **Ein kleiner Fund (Minor, kein Datenleck):** `POST /api/medication-logs` ([src/app/api/medication-logs/route.ts:62-73](src/app/api/medication-logs/route.ts#L62-L73)) validiert nicht, dass die übergebene `medicationId` tatsächlich dem aufrufenden User gehört, bevor der Log-Eintrag geschrieben wird (`user_id: userId` wird korrekt gesetzt, aber `medication_id` wird ungeprüft übernommen). Ein Angreifer könnte so einen Log-Eintrag anlegen, der auf die `medications`-Zeile eines fremden Users verweist. Da das Auslesen (`GET`) weiterhin strikt nach eigenem `user_id` filtert, entsteht dadurch **kein Datenzugriff auf fremde Inhalte** — nur ein "verwaister" Fremdschlüssel in den eigenen Log-Daten. Niedrige Priorität, aber sauber zu schließen.

**Was noch zu tun wäre:**
- In `POST /api/medication-logs` vor dem Upsert prüfen, dass `medications.id = medicationId AND medications.user_id = userId` existiert (ein zusätzliches `SELECT` oder ein `INSERT ... WHERE EXISTS` via Policy).
- Optional: Da RLS ohnehin überall aktiv ist, könnte langfristig geprüft werden, ob zumindest lesende Zugriffe direkt mit dem Anon-Key + RLS statt über den Service-Role-Key laufen könnten — reduziert die Angriffsfläche "ein Bug in der `user_id`-Filterung im Code" als Single Point of Failure. Kein akuter Handlungsbedarf, da aktuell konsequent korrekt gefiltert wird.

---

## 4. Input-Validierung & Injection — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befunde — Injection: 🟢**
- Keine rohen SQL-Strings, kein `.rpc()`, kein String-Concatenation für Queries gefunden — jeglicher DB-Zugriff läuft über den parametrisierten Supabase-JS-Query-Builder (`.eq()`, `.insert()`, `.update()` etc.). Klassische SQL-Injection ist damit strukturell ausgeschlossen.
- Kein `dangerouslySetInnerHTML`, kein `eval(`, kein `new Function(` im gesamten Quellcode gefunden. React escaped Nutzer-Content standardmäßig — klassisches Stored/Reflected-XSS über gerenderten User-Content ist damit strukturell weitgehend ausgeschlossen.
- Datei-Uploads (`analysis-uploads`) werden serverseitig re-validiert, nicht nur clientseitig: [src/app/api/analysis-uploads/shared.ts](src/app/api/analysis-uploads/shared.ts) prüft per Regex, dass es sich tatsächlich um eine `data:application/pdf;base64,...`-URL handelt (nicht nur die vom Client behauptete Dateiendung), plus eine Größenobergrenze (8 MB, `MAX_UPLOAD_PDF_BYTES`).

**Befunde — Validierungs-Vollständigkeit: 🟡**
- Die meisten Schreib-Routen validieren Typ/Enum/Länge serverseitig sauber (`medications/shared.ts`, `lab-results/shared.ts`, `profile/route.ts`, `processes` via `isProcessStageStatus`).
- **Lücke:** `PATCH /api/body-checks/[id]` ([src/app/api/body-checks/[id]/route.ts:20-35](src/app/api/body-checks/[id]/route.ts#L20-L35)) übernimmt `heightCm`, `weightKg` und `familyHistory` direkt aus dem Request-Body ohne jede Typ-/Bereichs-/Größenprüfung, bevor geschrieben wird. Datenbankseitig gibt es für `biological_sex` und `phase` zwar CHECK-Constraints (Migration `0007`/`0008`), aber für `height_cm`/`weight_kg` (numeric, keine Ober-/Untergrenze) und `family_history` (jsonb, keine Größenbeschränkung) existiert **keine** Grenze — weder in der DB noch im App-Code. Diese Route hat außerdem **kein Rate-Limiting** (im Gegensatz zum `POST` auf dieselbe Tabelle, das ein `isWithinRateLimit`-Limit hat).
- Praktische Auswirkung: gering (nur die eigene Zeile des Users betroffen, kein Multi-User-Impact), aber ein böswilliger oder fehlerhafter Client könnte per wiederholtem `PATCH` beliebig große JSON-Blobs in `family_history` schreiben (Storage-Kosten) oder unsinnige Körperma­ße speichern, die später in Referenzbereichs-Berechnungen einfließen.

**Was noch zu tun wäre:**
- In `body-checks/[id]/route.ts`: `heightCm`/`weightKg` auf einen plausiblen Bereich prüfen (z. B. 30–300 cm, 2–400 kg) und `familyHistory` auf eine Maximalgröße (z. B. JSON-Länge in Zeichen) begrenzen, analog zu `MAX_NOTES_LENGTH` in `analysis-uploads/route.ts`.
- Dasselbe Rate-Limiting-Muster (`isWithinRateLimit`) auch auf häufig wiederholbare `PATCH`-Endpunkte anwenden, zumindest mit großzügigem Limit, um Abuse-Loops zu deckeln.

---

## 5. API-Sicherheit — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befunde:**
- Alle Endpunkte, die personenbezogene/Gesundheitsdaten liefern, verlangen Authentifizierung (siehe Kategorie 3) — keine Ausnahme gefunden.
- **CORS:** Keine `Access-Control-Allow-Origin`-Header oder CORS-Middleware im gesamten Repo gefunden (weder in `next.config.ts` noch in einzelnen Routen, kein `OPTIONS`-Handler). Damit gilt Next.js' Default: keine Cross-Origin-Requests von fremden Origins möglich — das ist der sichere Default, keine offene `"*"`-Konfiguration vorhanden. 🟢
- **Rate-Limiting:**
  - Vorhanden und sauber generalisiert (`src/app/lib/rateLimit.ts`) auf allen INSERT-lastigen Endpunkten: `processes`, `body_checks` (POST), `medications`, `medication_intake_logs`, `lab_results`, `analysis_uploads`.
  - Der teuerste Call (Gemini-PDF-Extraktion, externe API mit Kosten) hat ein eigenes, sauber begründetes Tageslimit (`DAILY_EXTRACTION_LIMIT = 10` in [extract/route.ts:12](src/app/api/analysis-uploads/extract/route.ts#L12)).
  - **Nicht abgedeckt:** alle `PATCH`/`DELETE`-Routen (`[id]`-Endpunkte) sowie `profile` (PUT) und `account` (DELETE) haben kein Rate-Limiting. Für reine Lösch-/Update-Operationen auf eigene, bereits existierende Zeilen ist das Risiko geringer als bei neuen Inserts, aber ein authentifizierter Angreifer (oder gestohlenes Token) könnte diese Endpunkte unbegrenzt oft aufrufen und damit DB-Last erzeugen.
  - **Auth selbst (Login/Signup) ist nicht durch das eigene Rate-Limiting abgedeckt**, da diese Calls direkt gegen Supabase gehen (siehe Kategorie 2) — kein Next.js-Middleware-Rate-Limiting davor.
  - `isWithinRateLimit` ist bewusst **fail-open** designed (bei DB-Fehler beim Zähl-Query wird der Request durchgelassen, [rateLimit.ts:25-28](src/app/lib/rateLimit.ts#L25-L28)) — nachvollziehbare Priorisierung von Verfügbarkeit über strikte Durchsetzung, aber ein potenzieller Bypass-Pfad, falls der Zähl-Query gezielt zum Fehlschlagen gebracht werden könnte.
- Keine generelle IP-basierte Rate-Limiting-/WAF-Schicht vor der App erkennbar (im Code nicht vorhanden; könnte auf Vercel-Ebene existieren, ist aber nicht Teil dieses Repos und daher nicht verifizierbar).

**Was noch zu tun wäre:**
- Rate-Limiting auch auf `PATCH`/`DELETE`/`PUT`-Endpunkte ausweiten (großzügigere Limits reichen).
- Prüfen, ob auf Vercel/Infra-Ebene ein genereller IP-Rate-Limiter (z. B. Vercel Firewall / Edge Config) aktiviert werden kann, um die Lücke bei Login/Signup zu schließen, da Next.js-Middleware diese Calls nicht sieht.
- Bewusst entscheiden (und dokumentieren), ob Fail-Open beim Rate-Limit-Check die gewünschte Policy bleibt, oder ob für sicherheitskritischere Endpunkte Fail-Closed sinnvoller wäre.

---

## 6. Abhängigkeiten (Dependencies) — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befunde (`npm audit`, ausgeführt am 2026-07-25):** 12 High-Severity-Advisories, 0 Critical/Moderate/Low. Alle transitiv, keine direkt in `package.json` deklarierte Bibliothek:

| Paket | Kontext | Reale Produktions-Relevanz |
|---|---|---|
| `minimatch` / `brace-expansion` (ReDoS) | Transitiv über `eslint`, `eslint-config-next`, `@typescript-eslint/*` | **Nur Dev-Tooling** — wird nie mit ausgeliefert, nur beim lokalen/CI-Lint-Lauf aktiv. Praktisch kein Produktionsrisiko. |
| `postcss <=8.5.17` (XSS in Stringify-Output, Path Traversal via `sourceMappingURL`) | Intern in `next@16.2.11` gebündelt (`next/node_modules/postcss@8.4.31`) | Wird von Next.js' eigener Build-Pipeline für **eigenes** Tailwind-CSS verwendet, nicht für Angreifer-kontrollierten Input. Das separat im Projekt deklarierte `postcss` (Top-Level, `8.5.20`) liegt **außerhalb** des betroffenen Versionsbereichs. |
| `sharp <0.35.0` (libvips CVEs: CVE-2026-33327/33328/35590/35591) | Reale Dependency von `next@16.2.11` (installiert: `sharp@0.34.5`), für Next.js' eingebaute Bild-Optimierung (`/_next/image`-Route) | **Potenziell relevant für Produktion:** Die App verwendet nirgends die `<Image>`-Komponente (`git grep "next/image"` → keine Treffer), aber die `/_next/image`-Optimierungs-Route ist ein Next.js-Framework-Feature und könnte je nach Deployment-Konfiguration trotzdem erreichbar sein, unabhängig davon, ob die App sie selbst nutzt. |

Verifiziert: `next@16.2.11` ist aktuell die **neueste stabile** Next.js-Version (`npm view next version` → `16.2.11`; keine neuere stabile Version, nur Canary/Preview darüber) — die `postcss`/`sharp`-Advisories können also nicht durch ein einfaches Minor/Patch-Update behoben werden, das liegt aktuell upstream bei Vercel/Next.js.

**Was noch zu tun wäre:**
- Next.js-Releases beobachten und zeitnah aktualisieren, sobald eine Version mit gepatchtem `sharp`/`postcss` erscheint.
- Interimsmaßnahme prüfen: `overrides`/`resolutions` in `package.json`, um `sharp` und das interne `postcss` gezielt auf eine gepatchte Version zu zwingen (Kompatibilitätsrisiko testen).
- Da `next/image` nicht genutzt wird: prüfen, ob die Bildoptimierungs-Route deaktiviert werden kann/sollte (`images: { unoptimized: true }` in `next.config.ts`), um die `sharp`-Angriffsfläche unabhängig vom Upstream-Fix zu eliminieren.
- Dev-only-Findings (`eslint`-Kette) können mit niedrigerer Priorität behandelt werden, aber `npm audit fix` (ohne `--force`) regelmäßig laufen lassen.
- Keine automatisierte Dependency-Prüfung im Projekt vorhanden (kein Dependabot/Renovate-Config gefunden) — siehe auch Kategorie 8.

---

## 7. Datenverarbeitung & Datenschutz — 🟢 In Ordnung (Priorität: Niedrig) — *war 🔴 Kritisch, behoben am 2026-07-25*

**Hauptbefund — unvollständige Account-Löschung — ✅ BEHOBEN (Commit `d6ad460`):**
`DELETE /api/account` ([src/app/api/account/route.ts:10-18](src/app/api/account/route.ts#L10-L18)) definierte `USER_DATA_TABLES` als feste Liste:
```
lab_results, analysis_uploads, pdf_extractions, recommended_tests, processes, body_checks, profiles
```
Die Tabellen **`medications`** und **`medication_intake_logs`** (Migrationen `0016`/`0017`, Feature "Medikamente/Supplements") fehlten in dieser Liste. Da in keiner Migration ein `ON DELETE CASCADE` über eine Foreign Key zu `auth.users` existiert (verifiziert: kein `references auth.users` in irgendeiner Migration), wurden diese Zeilen bei einer Account-Löschung **nicht** entfernt. Nach "Konto löschen" wären dauerhaft verblieben: Namen von Medikamenten/Supplements, Dosierungs-/Beschreibungstexte und tägliche Einnahme-Logs — allesamt Gesundheitsdaten (Art. 9 DSGVO).

Das widersprach direkt der eigenen Zusage in der Datenschutzerklärung: [src/app/datenschutz/page.tsx:74-75](src/app/datenschutz/page.tsx#L74-L75) — *"Ein „Konto löschen" findest du oben rechts in der App -- das entfernt sofort und unwiderruflich **alle** deine Daten."* Diese Aussage war dadurch **faktisch falsch** und stellte sowohl eine Verletzung von Art. 17 DSGVO (Recht auf Löschung) als auch eine irreführende Angabe in der eigenen Datenschutzerklärung dar (Art. 12/13).

**Fix:** `medications` und `medication_intake_logs` wurden in `USER_DATA_TABLES` ergänzt ([src/app/api/account/route.ts:11-21](src/app/api/account/route.ts#L11-L21)). Die Zusage in der Datenschutzerklärung stimmt damit wieder mit dem tatsächlichen Verhalten überein.

**Weitere Befunde:**
- HTTPS wird über `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` erzwungen ([next.config.ts:25](next.config.ts#L25)). 🟢
- Fehlerausgaben an den Client sind konsequent generisch gehalten: `serverError()` ([src/app/lib/apiError.ts](src/app/lib/apiError.ts)) loggt die Detail-Message serverseitig via `console.error`, gibt dem Client aber nur `"Serverfehler, bitte später erneut versuchen."` zurück — kein Stack-Trace, keine internen Pfade, keine DB-Fehlermeldungen im Response-Body. Über alle Routen konsistent verwendet (Verbesserung gegenüber dem 2026-07-24-Audit, das hier noch rohe `error.message`-Durchreichung bemängelt hatte). 🟢
- Logging ist datensparsam: z. B. in [extract/route.ts:165,176,188-191](src/app/api/analysis-uploads/extract/route.ts#L165) werden nur `userId` + technische Metadaten (Token-Zahlen, gekürzter Response-Ausschnitt bei Parse-Fehlern) geloggt, nie der volle Dokumenteninhalt oder Nutzer-Klartext. 🟢
- Bereits behobene Punkte aus dem `DSGVO_AUDIT.md` (Commit `845d0cd`): granulare Korrektur/Löschung einzelner Laborwerte, Offenlegung des Gemini-USA-Transfers in der Datenschutzerklärung, PII-Warnhinweis in der Familienanamnese. Nicht erneut geprüft, da bereits dokumentiert behoben.
- Weiterhin offen aus dem `DSGVO_AUDIT.md` (unverändert, rechtliche statt technische Frage): Familienanamnese erfasst Gesundheitsdaten von Verwandten ohne deren eigene Einwilligung/Informationsrecht (Art. 14) — siehe dort, Punkt 6.

**Was noch zu tun wäre (Priorität Niedrig, Rest-Punkte nach dem Fix):**
1. ✅ ~~`medications` und `medication_intake_logs` in `USER_DATA_TABLES` ergänzen~~ — erledigt, Commit `d6ad460`.
2. Den Löschvorgang end-to-end testen (Testkonto mit Medikamenten anlegen, löschen, per SQL verifizieren, dass wirklich nichts übrig bleibt) — Code-Fix ist drin, ein tatsächlicher Testlauf gegen die DB steht noch aus.
3. Generell: einen Prozess/Test etablieren, der bei jeder neuen personenbezogenen Tabelle automatisch daran erinnert, sie in die Löschroutine aufzunehmen (z. B. ein einfacher Test, der alle Tabellen mit `user_id`-Spalte aus dem Schema gegen `USER_DATA_TABLES` abgleicht), damit dieser Fehler nicht beim nächsten Feature wieder auftritt.
4. Den Lösch-Loop in `account/route.ts` auf Teilausfälle prüfen: Aktuell ist er nicht transaktional — schlägt Tabelle N fehl, sind Tabellen 1..N-1 bereits gelöscht, der Account bleibt aber bestehen (inkonsistenter Zwischenzustand). Für eine "Recht auf Löschung"-Funktion relevant, aber kein akuter Vorfall bekannt.

---

## 8. Infrastruktur & Deployment-Konfiguration — 🟡 Verbesserungswürdig (Priorität: Mittel)

**Befunde:**
- **Security-Header** ([next.config.ts:21-27](next.config.ts#L21-L27)), angewendet auf `/(.*)`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (2 Jahre + preload), sowie eine CSP mit `default-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Solide Grundausstattung, seit dem letzten Audit neu ergänzt. 🟢
  - Einschränkung: `script-src 'self' 'unsafe-inline'` — das `'unsafe-inline'` ist für Next.js' Hydration-Bootstrap-Skripte nötig (im Code kommentiert, bewusste Entscheidung), schwächt aber den XSS-Schutzwert der CSP selbst für den Fall ab, dass doch einmal Inline-Script injiziert werden könnte. Die primäre XSS-Verteidigung bleibt Reacts Default-Escaping (siehe Kategorie 4), nicht die CSP.
  - `frame-src`/`object-src` wurden kürzlich gezielt um `data:` erweitert, um die neue In-App-Dokumenten-Vorschau zu ermöglichen — eng auf den konkreten Zweck begrenzt, keine pauschale Öffnung.
- `poweredByHeader` ist nicht explizit auf `false` gesetzt → Next.js sendet standardmäßig `X-Powered-By: Next.js` mit aus. Geringfügiges Informationsleck (verrät das Framework), triviale Fix-Kosten, niedrige Priorität für sich genommen.
- Keine Produktions-Sourcemaps im ausgelieferten Bundle (`.next/static/**/*.map` → 0 Treffer geprüft) — sicherer Default, nicht verändert. 🟢
- **Kein CI/CD-Setup im Repository** — kein `.github/workflows`, kein `vercel.json`, keine Lint-/Test-/Audit-Pipeline gefunden. Das Vorhandensein eines `VERCEL_OIDC_TOKEN` in `.env.local` deutet auf manuelles Deployment via Vercel-Dashboard/CLI hin. Das bedeutet: Es gibt aktuell **keine automatisierte Instanz**, die vor einem Deployment `npm audit`, Linting, Typecheck oder Tests erzwingt — ein Fehler oder eine neue Schwachstelle würde nicht automatisch abgefangen.
- **Datenbank-Exposure:** Postgres läuft komplett managed bei Supabase, nicht selbst gehostet — kein direktes Netzwerk-Exposure-Risiko im klassischen Sinn (kein offener Port, den man dichtmachen müsste). Relevanter Kontrollpunkt ist RLS (siehe Kategorie 3), dort durchgehend aktiv.
- Debug-/Dev-Modus: keine `NODE_ENV`-Sonderfälle oder Debug-Flags im Code gefunden, die in Produktion aktiv blieben.

**Was noch zu tun wäre:**
- Minimale CI-Pipeline einrichten (z. B. GitHub Actions): `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --audit-level=high` bei jedem PR/Push nach `main`.
- `poweredByHeader: false` in `next.config.ts` setzen.
- Erwägen, `Permissions-Policy` und `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy` als zusätzliche Header zu ergänzen (niedrige Priorität, zusätzliche Härtung).

---

## 9. Sonstiges / Business-Logic-Risiken — 🟢 In Ordnung (Priorität: Niedrig)

**Befunde:**
- Kein Zahlungs-/Preis-Feature in der App — klassische Preis-Manipulation entfällt als Angriffsvektor.
- Prozess-/Test-Status (`processes`, `recommended_tests`, `body_checks.phase`) kann per PATCH direkt auf jeden gültigen Enum-Wert gesetzt werden, auch übersprungen (z. B. direkt "hochgeladen" ohne die Zwischenschritte). Da es sich um rein selbstberichtete Tracking-Daten der eigenen Zeile handelt (kein Trust-Boundary-Übergang, kein Effekt auf Dritte oder auf reale Ressourcen), ist das keine Sicherheitslücke, sondern höchstens eine Dateninkonsistenz, die der Nutzer nur sich selbst gegenüber verursachen könnte. Rein informativ vermerkt, da explizit nach "offensichtlichen Logikfehlern" gefragt wurde.
- `isWithinRateLimit` fail-open (siehe Kategorie 5) ist eine bewusste Business-Logic-Entscheidung (Verfügbarkeit vor strikter Durchsetzung) — hier nochmals im Kontext "Missbrauchspotenzial" vermerkt, da ein DB-Fehler beim Zähl-Query theoretisch als Rate-Limit-Bypass genutzt werden könnte, falls ein Angreifer einen solchen Fehler gezielt provozieren könnte (aktuell keine bekannte Methode dazu identifiziert).

**Was noch zu tun wäre:** Kein akuter Handlungsbedarf. Bei Bedarf könnten serverseitige Plausibilitätsprüfungen für Statusübergänge (z. B. "nur um eine Stufe vor-/zurückspringen") ergänzt werden, das ist aber eher ein UX-/Datenqualitäts- als ein Sicherheitsthema.

---

## Priorisierte Handlungsliste

1. ✅ **Erledigt (2026-07-25):** `medications`/`medication_intake_logs` in die Account-Löschroutine (`USER_DATA_TABLES`) aufgenommen (Commit `d6ad460`). Offen bleibt nur noch ein End-to-End-Test des Löschvorgangs gegen die echte DB (Kategorie 7).
2. ✅ **Erledigt (2026-07-25):** `SUPABASE_SERVICE_ROLE_KEY`/`GEMINI_API_KEY`/`VERCEL_OIDC_TOKEN` laut Nutzerangabe rotiert.
3. **Mittel:** Rate-Limiting auf `PATCH`/`DELETE`/`PUT`-Endpunkte ausweiten, insbesondere `body-checks/[id]` (Kategorie 4/5).
4. **Mittel:** `body-checks/[id]` PATCH um Bereichs-/Größenvalidierung für `heightCm`/`weightKg`/`familyHistory` ergänzen (Kategorie 4).
5. **Mittel:** Dependency-Lage bei `sharp`/`postcss` beobachten bzw. `overrides` und Deaktivierung der ungenutzten `/_next/image`-Route prüfen (Kategorie 6).
6. **Mittel:** Minimale CI-Pipeline (Lint, Typecheck, Build, `npm audit`) einrichten (Kategorie 8).
7. **Niedrig:** `POST /api/medication-logs` um Ownership-Check für `medicationId` ergänzen (Kategorie 3).
8. **Niedrig:** `poweredByHeader: false` setzen; Supabase-Auth-Rate-Limits/CAPTCHA und Passwort-Mindestlänge im Dashboard bewusst konfigurieren (Kategorie 2/8).

---

## Anhang: geprüfte Artefakte

- Alle 15 API-Routen unter `src/app/api/**/route.ts`
- Alle 17 Migrationen unter `supabase/migrations/*.sql`
- `next.config.ts`, `src/proxy.ts`, `src/app/lib/*.ts`
- `package.json`/`package-lock.json` (`npm audit`)
- Git-Historie (`git log --all`) auf `.env*`-Dateien
- `.env.local.example`, `.gitignore`
- `DSGVO_AUDIT.md` und vorherige `SECURITY_AUDIT.md` (Vorgängerbefunde, Cross-Referenz)
