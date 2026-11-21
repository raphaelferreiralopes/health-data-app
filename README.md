# longevitystack – health data app

A web app that brings personal health data into one place: lab results, doctor's reports, medications, wearable data and upcoming appointments, explained in plain language and checked against sourced reference ranges.

I built it because my own health data was scattered across PDFs from different labs, a Fitbit account and notes on my phone. It started as a read-only view of lab values and grew into a multi-user app with authentication, AI-assisted document upload and wearable integrations. The UI is in German because it targets users in Germany.

Live: [longevitystack.vercel.app](https://longevitystack.vercel.app) (landing page and login on one domain)

<!-- Screenshot: add one at docs/screenshot.png and uncomment the line below -->
<!-- ![longevitystack: lab results overview](docs/screenshot.png) -->

## Highlights

- **Lab values with context.** A catalog of 136 parameters in 12 categories, each with a three-level explanation (short, detailed, expert) and reference ranges that depend on age and sex. Every reference range records its source (mostly German university hospital lab handbooks).
- **Upload a doctor's report, get it explained.** PDFs and photos of lab reports and prescriptions are read by Gemini, which extracts the values into the database and explains the report at three levels of detail.
- **Wearables.** OAuth integrations for Fitbit (via the Google Health API) with sleep, vitals and activity views. Whoop is built and shown as "planned".
- **Medications and supplements.** Configurable schedules with several doses per day and a daily checklist. Prescriptions can be added from a photo.
- **More views.** An interactive organ map that links organs to lab values, a guided full-body check, recommended follow-up tests, appointment tracking and a chatbot that answers questions about your own data.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend and API | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database and auth | Supabase (Postgres, Auth, row-level security) |
| AI | Google Gemini for document extraction, explanations and the chatbot |
| Integrations | Google Health API (Fitbit), Whoop API |
| Hosting | Vercel |
| Schema | 22 versioned SQL migrations in `supabase/migrations/` |

## Security and privacy

Health data is a special category under the GDPR, so I treated security and privacy as part of the product rather than an afterthought.

- **Isolation in the database.** Every table with personal data has a row-level security policy on `auth.uid() = user_id`. API routes also filter by the caller's user id as a second layer.
- **Hardened API.** Rate limiting on write endpoints, runtime validation of inputs, generic error messages to the client, and security headers (CSP, HSTS, X-Frame-Options and others) in `next.config.ts`.
- **GDPR basics.** Explicit consent for health data at signup, account deletion that removes every user table, no tracking or analytics cookies, and a privacy notice that lists all processors.
- **Written audits.** [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) and [`DSGVO_AUDIT.md`](DSGVO_AUDIT.md) document a full review of the codebase, what was found and what has been fixed since.

## Design decisions

- **A framework-agnostic core.** `src/core/` holds types, queries and the reference-range logic without any Next.js imports, so it can move into a React Native app later without changes.
- **No ORM.** The app mostly reads and displays data. Plain `supabase-js` queries kept it simpler than adding Prisma or Drizzle.
- **Stable keys in the catalog.** Every lab parameter has a readable `key` (for example `hemoglobin`) next to its uuid. Seed data and migrations reference parameters by key, so no hand-maintained uuids are needed.
- **History is in the schema from day one.** A user can have many results per parameter. The UI currently shows the latest value, and charts over time need no schema change.
- **Age bands only where a source exists.** Age-specific reference ranges were added for 14 parameters with a citable adult age cut-off and deliberately left out elsewhere.

## Project structure

```
src/
  app/
    (app)/        Signed-in pages: home, database, medications, organ map, processes, admin
    api/          Route handlers (lab results, uploads, medications, wearables, chat, account)
    lib/          Server helpers: auth, rate limiting, Supabase and Gemini clients
    login/        Login and signup
  core/           Framework-agnostic types, queries and reference-range logic
supabase/
  migrations/     Versioned schema and RLS policies
  seed.sql        Lab catalog, reference ranges and demo results for a fixed demo user
```

## Run locally

1. Create a Supabase project, or run `supabase start` if you have the Supabase CLI.
2. Apply the files in `supabase/migrations/` in order (SQL editor or `supabase db push`), then load `supabase/seed.sql`.
3. Copy `.env.local.example` to `.env.local` and fill in the values. Supabase and Gemini are required. The Whoop and Google Health keys are only needed for the wearable integrations.
4. `npm install && npm run dev`, then open [http://localhost:3010](http://localhost:3010).

## Status

A working beta that I use myself. Reference ranges are sourced but not reviewed by a medical professional, and the app is not a medical device.
