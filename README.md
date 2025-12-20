# STEVI — Supportive Technology to Enable Vulnerable Individuals

STEVI is the standalone client portal for the Integrated Homelessness and Addictions Response Centre (IHARC). It serves
neighbours at `https://stevi.iharc.ca`, giving clients and outreach staff a secure space to request appointments, track
plans, access documents, and receive outreach updates. The marketing site at `https://iharc.ca` stays public and
read-only; both apps share the same Supabase project.

## Getting Started

- **Prerequisites**: Node.js 24.12.0+ (npm 10+). Run `nvm use` if you have it installed.
- **Configure env**: Copy `.env.example` to `.env.local` and fill the Supabase + app URLs (see below).
- **Install dependencies**: `npm install`
- **Run locally**: `npm run dev` (http://localhost:3000)
- **Type checks**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Unit tests**: `npm run test`
- **E2E tests**: `npm run e2e`

Environment variables (full notes in `docs/backend.md`):
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`
- Optional: `PORTAL_ALERTS_SECRET` (Edge Function trigger), `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_ANALYTICS_DISABLED`, `SUPABASE_SERVICE_ROLE_KEY` (local scripts only)
- E2E credentials (Playwright): `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_CLIENT_EMAIL`, `E2E_CLIENT_PASSWORD`
- E2E CRUD tests use the Supabase URL + publishable key above, create `portal.resource_pages` rows prefixed with `e2e-crud-resource-`, and scrub them during teardown. If teardown fails, delete rows where `slug like 'e2e-crud-resource-%'`.

## Tech Stack

- Next.js 16 App Router with React Server Components (React 19)
- TypeScript + Tailwind CSS with shadcn/ui tokens sourced from `src/styles/theme.css`, Radix primitives, and TipTap for rich text
- Supabase Auth/Database/Edge Functions shared with the marketing portal (schemas: `portal`, `core`, `case_mgmt`, `inventory`, `donations`)
- Vitest + Testing Library for unit coverage; Playwright for end-to-end flows
- Azure App Service (Linux, Node 24.12.x) deployed via GitHub Actions (`.github/workflows/main_stevi.yml`); build entry `node build.js` runs lint + forces a webpack Next build for standalone output. Runtime uses `.next/standalone/server.js`.

## Architecture

- Dual shells: client routes live in `src/app/(client)` with their own layout/theme/navigation; Operations routes live in `src/app/(ops)`.
- Boundaries enforced via `requireArea`, lint rules, and path aliases (`@client/*`, `@workspace/*`, `@shared/*`). See `docs/architecture/shells.md` for the migration checklist and guard expectations.

## Migration Status

- ✅ Next.js scaffold, shared layout/providers, shadcn/ui tokens
- ✅ Supabase clients (server + RSC), Proxy token refresh + security headers, separated client/ops navigation
- ✅ Client portal shells: home, appointments, documents, cases, support, profile, consents (wired to Supabase + storage)
- ✅ Admin tools: profiles/invites, resources, policies, notifications, marketing content, inventory, donations
- ✅ Staff tools: caseload, schedule, outreach log; Organization tools: members/invites/settings
- 🚧 Wire Messages page and staff Tasks view to real data with audit + consent/RLS
- 🚧 Add cache revalidation/webhook strategy so marketing and STEVI stay in sync
- 🚧 Increase test coverage (Vitest + Playwright) and flesh out metrics/governance surfaces if kept

See `agents.md` for the latest operator briefing and outstanding work.
