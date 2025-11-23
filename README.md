# STEVI — Supportive Technology to Enable Vulnerable Individuals

STEVI is the standalone client portal for the Integrated Homelessness and Addictions Response Centre (IHARC). It will
serve neighbours at `https://stevi.iharc.ca`, giving clients and outreach staff a secure space to request
appointments, track plans, sign petitions, and access tailored resources. The marketing site at `https://iharc.ca`
remains focused on public storytelling while this repo carries the authenticated experience.

## Getting Started

- **Prerequisites**: Node.js 20.x (npm 10+). Use `nvm use` to stay aligned with production.
- **Install dependencies**: `npm install`
- **Run locally**: `npm run dev` (defaults to <http://localhost:3000>)
- **Type checks**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Unit tests**: `npm run test`
- **E2E tests**: `npm run e2e`

Copy `.env.example` (to be added in a future step) into `.env.local` and supply Supabase credentials, analytics flags,
and the canonical app URL (`NEXT_PUBLIC_APP_URL=https://stevi.iharc.ca`) before hitting live data.

## Tech Stack

- Next.js 15 App Router with React Server Components
- TypeScript + Tailwind CSS tokens (Material 3-aligned), Radix UI primitives, shadcn-inspired component wrappers
- Supabase Auth/Database/Edge Functions shared with the IHARC marketing portal
- Vitest + Testing Library for unit coverage, Playwright for end-to-end flows
- Azure Static Web Apps deployment (Azure workflow authored manually outside this repo)

## Migration Status

- ✅ Next.js scaffold ported with shared layout, providers, and design tokens
- ✅ Tailwind/PostCSS/ESLint/TS configs aligned to IHARC standards
- ✅ Placeholder landing screen wired with STEVI metadata
- 🚧 Portal routes, cached Supabase loaders, server actions, and edge-function adapters pending migration
- 🚧 Documentation & environment samples in progress

See `agents.md` for the full extraction and enhancement strategy.
