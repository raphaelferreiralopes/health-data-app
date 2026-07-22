# Gesundheitswerte (MVP)

Web-App zur zentralen, kategorisierten Ansicht persönlicher Gesundheitswerte
(Blut, Urin, Stuhl, Allergie). Kein Wearable-Sync, kein Arztbrief-Upload,
kein Onboarding, kein Auth-UI -- nur die Datenbank-Ansicht.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres) mit Row-Level-Security, Zugriff über `@supabase/supabase-js`
  (kein ORM -- bei reinem Read-Display für 4 Tabs wäre Prisma/Drizzle unnötiger
  Overhead)
- `src/core/` ist framework-agnostisch (keine Next.js-Imports): Typen,
  Supabase-Client-Factory, Query-Funktionen, Referenzbereichs-Logik. Diese
  Schicht soll später 1:1 in eine React Native/Expo-App wandern.

## Setup

1. Supabase-Projekt anlegen (oder `supabase start` lokal, falls die
   Supabase CLI installiert ist).
2. Migrationen ausführen: `supabase/migrations/0001_schema.sql`, dann
   `0002_rls_policies.sql` (SQL-Editor im Dashboard oder `supabase db push`).
3. Seed-Daten laden: `supabase/seed.sql`.
4. `.env.local.example` nach `.env.local` kopieren und mit den Werten aus
   Project Settings -> API befüllen.
5. `npm install && npm run dev`, dann [http://localhost:3010](http://localhost:3010)
   öffnen (redirected auf `/blutanalyse`). Port 3010 ist fest im `dev`-Skript
   hinterlegt, damit `journal-app` weiter Port 3000 nutzen kann.

## Datenmodell

```
lab_categories (id, key, name, tab, sort_order)
lab_subcategories (id, category_id, key, name, sort_order)
lab_parameters (id, subcategory_id, key, name, abbreviation, unit,
                description_level1, description_level2, description_level3,
                learn_more_url, result_type [numeric|qualitative], sort_order)
lab_reference_ranges (id, parameter_id, min, max, qualitative_normal,
                      gender [m|f|all], age_min, age_max)
lab_results (id, user_id, parameter_id, value, value_qualitative,
             measured_at, source_document_id)
```

`key` ist ein stabiler, menschenlesbarer Bezeichner (z. B. `hemoglobin`),
unabhängig von der uuid -- verwendet in `seed.sql`, um Fremdschlüssel ohne
handgepflegte uuid-Literale zu verdrahten, und später für Deep-Links oder
LOINC-artige Verknüpfung nutzbar.

`supabase/seed.sql` enthält den vollständigen Katalog aus
`laborwerte_katalog.xlsx`: 12 Kategorien, 34 Unterkategorien, 136 Parameter.
Referenzbereiche und result_type wurden nachträglich angereichert (im
Original-Katalog laut Sheet "Legende" bewusst leer gelassen). Demo-Messwerte
für den festen Demo-User gibt es weiterhin nur für eine kleine, realistische
Auswahl von ~19 Parametern -- die App zeigt ohnehin nur Parameter mit
tatsächlichem Eintrag an.

Verlauf ist im Schema bereits möglich (mehrere `lab_results` pro
`parameter_id`/`user_id`); die App zeigt aktuell nur den jeweils neuesten
Wert (`getTabOverview`/`getParameterDetail` sortieren nach `measured_at desc`
und nehmen den ersten Treffer).

## Kein Auth im MVP

`src/core/demoUser.ts` definiert eine feste `DEMO_USER_ID` (muss mit
`user_id` in `seed.sql` übereinstimmen) plus eine Platzhalter-Demografie
(Geschlecht/Alter) für die Referenzbereichs-Auswahl. Der Next.js-Server
liest mit dem Supabase **Service-Role-Key** (`src/app/lib/supabaseServer.ts`,
server-only, niemals im Client verwenden), da RLS auf `lab_results` bereits
scharf auf `auth.uid() = user_id` steht. Sobald echtes Auth aktiviert wird,
muss nur `DEMO_USER_ID`/`DEMO_USER_PROFILE` durch die echte Session ersetzt
werden -- die RLS-Policies und Queries bleiben unverändert.

## Platzhalter, die vor echtem Einsatz ersetzt werden müssen

- Referenzbereiche in `supabase/seed.sql`: plausible Literaturwerte, keine
  geprüften Laborreferenzen.
- `learn_more_url` pro Parameter: zeigt auf eine Platzhalter-Domain
  (`platzhalter-lexikon.example`), gedacht als austauschbares Datenfeld.
- `DEMO_USER_PROFILE` (Geschlecht/Alter): fest codiert, da es noch kein
  User-Profil gibt.
