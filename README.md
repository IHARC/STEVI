# STEVI — Supportive Technology to Enable Vulnerable Individuals

STEVI is the standalone client portal for the Integrated Homelessness and Addictions Response Centre (IHARC). It serves
neighbours at `https://stevi.iharc.ca`, giving clients and outreach staff a secure space to request appointments, track
plans, access documents, and receive outreach updates. The marketing site at `https://iharc.ca` stays public and
read-only; both apps share the same Supabase project.

## Getting Started

- **Prerequisites**: Node.js 24.11.1+ (npm 10+). Run `nvm use` if you have it installed.
- **Configure env**: Copy `.env.example` to `.env.local` and fill the Supabase + app URLs (see below).
- **Install dependencies**: `npm install`
- **Run locally**: `npm run dev` (http://localhost:3000)
- **Type checks**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Unit tests**: `npm run test`
- **E2E tests**: `npm run e2e`

Environment variables (full notes in `docs/backend.md`):
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`
- Optional: `PORTAL_ALERTS_SECRET` (Edge Function trigger), `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_ANALYTICS_DISABLED`, `SUPABASE_SERVICE_ROLE_KEY` (local scripts only)

## Tech Stack

- Next.js 16 App Router with React Server Components (React 19)
- TypeScript + Tailwind CSS with shadcn/ui tokens sourced from `src/styles/theme.css`, Radix primitives, and TipTap for rich text
- Supabase Auth/Database/Edge Functions shared with the marketing portal (schemas: `portal`, `core`, `case_mgmt`, `inventory`, `donations`)
- Vitest + Testing Library for unit coverage; Playwright for end-to-end flows
- Azure App Service (Linux, Node 24.11.x) deployed via GitHub Actions (`.github/workflows/main_stevi.yml`); build entry `node build.js` runs lint + default Next build (Turbopack). Runtime uses the Next standalone output (`node .next/standalone/server.js`).

## Architecture

- Dual shells: client routes live in `src/app/(client)` with their own layout/theme/navigation; Operations routes live in `src/app/(ops)`.
- Boundaries enforced via `requireArea`, lint rules, and path aliases (`@client/*`, `@workspace/*`, `@shared/*`). See `docs/architecture/shells.md` for the migration checklist and guard expectations.

## Migration Status

- ✅ Next.js scaffold, shared layout/providers, shadcn/ui tokens
- ✅ Supabase clients (server + RSC), auth middleware, separated client/ops navigation
- ✅ Client portal shells: home, appointments, documents, cases, support, profile, consents (appointments/documents currently read from placeholders)
- ✅ Admin tools: profiles/invites, resources, policies, notifications, marketing content, inventory, donations
- ✅ Staff tools: caseload, schedule, outreach log; Organization tools: members/invites/settings
- 🚧 Wire appointments + documents to Supabase tables/storage; add cache revalidation/webhooks
- 🚧 Fill out test coverage (Vitest + Playwright) and metrics/governance surfaces if required

See `agents.md` for the latest operator briefing and outstanding work.
