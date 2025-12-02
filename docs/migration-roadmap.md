# STEVI Migration Roadmap

This roadmap tracks the extraction of the IHARC portal from the marketing site into the dedicated STEVI client portal.
Each phase maps to the plan outlined in `agents.md`.

## Phase 0 — Alignment & Inventory ✔
- Captured mission/goals in `agents.md`.
- Documented source-of-truth portal assets and Supabase dependencies.

## Phase 1 — Repo Scaffolding 🚧 (current)
- ✅ Initialise Next.js 16 scaffold with shared layout/providers and design tokens.
- ✅ Align tooling: Tailwind, PostCSS, ESLint, TSConfig, build script.
- ☐ Introduce `.env.example` describing Supabase + analytics requirements.
- ☐ Configure base routing structure (`/ideas`, `/plans`, `/progress`, etc.) with placeholders.

## Phase 2 — Library & Component Extraction ☐
- Copy portal-centric libraries under `src/lib/**` (cache, audit, plans, petition, profile, rate-limit, supabase).
- Migrate cached data loaders from `src/data/**`.
- Bring over portal UI components (`src/components/portal/**`, moderation/admin surfaces).

## Phase 3 — Route Recreation ☐
- Rebuild `/ideas`, `/plans`, `/petition`, `/progress`, `/profile`, `/auth` routes.
- Restore server actions, middleware, and Supabase interactions.
- Port Vitest suites and Playwright flows.

## Phase 4 — Client Portal Enhancements ☐
- Implement personalised dashboard, appointment scheduler, secure document locker, outreach log module.
- Extend profile management and notification preferences.

## Phase 5 — Launch Readiness ☐
- Run full QA (lint, typecheck, unit, e2e).
- Wire Azure App Service deployment (GitHub Actions workflow `main_stevi.yml` with publish profiles).
- Remove portal routes from marketing repo and add cross-site redirects.

Status legend: ✔ complete · 🚧 in progress · ☐ pending.
