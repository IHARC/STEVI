# STEVI Agent Briefing

## Mission Snapshot
- **Product name**: STEVI — Supportive Technology to Enable Vulnerable Individuals.
- **Purpose**: Dedicated client portal that lets IHARC neighbours experiencing homelessness or substance use challenges access personalised plans, submit ideas, follow working plans, sign petitions, and stay in touch with outreach staff.
- **Primary users**: IHARC clients, frontline outreach workers, moderators, and collaborating agencies. Marketing visitors will continue using the public IHARC marketing site at `https://iharc.ca`.
- **Success guardrails**: Keep compassionate tone, accessible semantics, and privacy guarantees reflected in `I.H.A.R.C-Public-Website/docs/portal/architecture.md`. No regression to Supabase RLS/Audit flows.

## Source System Overview
- The current portal lives inside the marketing Next.js app (`I.H.A.R.C-Public-Website/src/app/portal/*`) with shared components in `src/components/portal`, cached data loaders in `src/data/{ideas,plans,metrics,petition,pit}.ts`, and supporting libraries under `src/lib/{cache,auth,audit,plans,petition,profile,rate-limit,supabase}`.
- Edge Functions (`portal-moderate`, `portal-ingest-metrics`, `portal-attachments`, `portal-admin-invite`) and RPC helpers already power moderation, rate limiting, audit logging, and attachment workflows.
- Marketing-only surfaces live in `src/app/(marketing)/*`, with navigation shells (`src/components/shells/*`) blending portal and marketing links.

## Target Architecture
- Separate repositories:
  - `I.H.A.R.C-Public-Website`: marketing shell only; portal routes removed and replaced with links/redirects to STEVI.
  - `STEVI`: Next.js 15 App Router app dedicated to the portal. Reuse Supabase project, schema, and edge functions. Preserve tagged caching contract from `src/lib/cache/*`.
- Shared design/dev foundations:
  - Copy shared tokens from `src/styles/main.css` and Tailwind config into STEVI. Consider extracting a shared config package (`packages/design-system`) if both repos will evolve together.
  - Move reusable utilities (`src/lib/utils.ts`, `src/lib/supabase/*`, `src/components/providers/*`) to STEVI and leave thin wrappers or duplicated copies in marketing app as needed.
- Infrastructure:
  - Azure Static Web Apps deploys each repo separately. Supabase environment variables stay in place; STEVI gets its own SWA with identical env wiring.

## Migration & Upgrade Plan

### Phase 0 — Alignment & Inventory
- Confirm Supabase schema stays in one project. Use Supabase MCP tool to capture the latest schema snapshot and document dependencies in `STEVI/docs/backend.md`.
- Catalogue portal routes, server actions, caching keys, and edge-function touchpoints. Cross-check with docs under `I.H.A.R.C-Public-Website/docs/portal/*`.
- Decide on canonical domain (e.g., `https://portal.iharc.ca`) and SSO/auth approach (Supabase auth sessions stay first-party).

### Phase 1 — Prepare STEVI Repo
- Scaffold Next.js 15 / TypeScript app in `STEVI/` mirroring lint, build, Tailwind, and Vitest/Playwright setup from the marketing repo.
- Port base config files: `tsconfig.json`, `next.config.mjs`, `postcss.config.cjs`, `tailwind.config.ts`, `tailwind.config.cjs` (if still needed), `vitest.config.ts`, `.env.example`.
- Add shared providers (`ThemeProvider`, `AnalyticsProvider`, `ConsentBanner`) and `src/styles/main.css` to keep typography & tokens aligned.
- Create Supabase clients (`src/lib/supabase/{server,client,rsc,public-client}.ts`), cache helpers, and auth middleware identical to current portal implementation.

### Phase 2 — Extract Shared Libraries & Components
- Copy portal-specific libraries: `src/lib/{audit.ts,auth.ts,cache/*,plans.ts,petition,profile.ts,rate-limit.ts,reactions.ts,notifications.ts,telemetry.ts}`. Review each file; if marketing still relies on any module, keep a duplicate or refactor into a small shared npm package later.
- Move portal data loaders from `src/data/{ideas,plans,petition,metrics,pit}.ts`. Preserve `unstable_cache` tags from `src/lib/cache/tags.ts` and invalidation utilities.
- Migrate components from `src/components/portal/*`, `src/components/admin/*` (for moderation), and any shared shells or layout pieces used by authenticated pages. Ensure import paths stay relative to new repo root (`@/` alias).
- Bring over server actions, route handlers (`src/app/portal/api/*`), and middleware logic (`middleware.ts`) that currently enforce auth.
- Sync domain-specific docs into `STEVI/docs/portal/*` so product context travels with the new repo.

### Phase 3 — Rebuild Portal Routes in STEVI
- Recreate directory structure under `STEVI/src/app`:
  - `/ideas`, `/ideas/submit`, `/ideas/[id]`
  - `/plans`, `/plans/[slug]`
  - `/progress`, `/progress/pit`
  - `/petition/[slug]` plus shared marketing preview components if still required.
  - `/about`, `/profile`, `/auth` routes (`login`, `register`, `reset-password`), and middleware-driven gating.
- Wire existing Supabase queries and mutations via copied data loaders. Confirm Edge Function calls (`portal-moderate`, etc.) remain reachable.
- Restore tests (Vitest unit tests, Playwright e2e) that cover portal flows. Update config paths to new repo layout.
- Update copy to reference STEVI branding where appropriate while keeping IHARC-insistence for formal names.

### Phase 4 — Upgrade to Full Client Portal
- Introduce logged-in landing hub: personalised dashboard summarising assigned plans, petition involvement, and key dates.
- Add secure document locker backed by existing `portal-attachments` bucket with client-specific foldering and expiring links.
- Extend profile flows (`src/components/portal/profile/*`) to capture preferred contact windows, language, and consent toggles.
- Build outreach log module: quick entries for field staff tied to `plans` or `ideas`, respecting audit logging and RLS. If new tables are required, design migrations compatible with existing Supabase schema.
- Expand `progress` area with per-user insights (e.g., plan milestones, petition updates) while keeping aggregated community metrics intact.
- Add notification preferences UI that maps to Supabase `notifications` tables and existing edge functions.
- Ensure all new pages honour caching strategy (dynamic routes or tagged caches) and leverage existing rate limiting / audit helpers.

### Phase 5 — Hardening & Launch
- Run full regression suite (lint, typecheck, unit, e2e). Validate cache invalidation by triggering mutations and confirming tags invalidate via `src/lib/cache/invalidate.ts`.
- Conduct security review: verify middleware protections, Supabase RLS, and attachment signing flows in the new app context.
- Coordinate content freeze, then remove portal routes from marketing repo:
  - Delete `src/app/portal/*`, `src/app/ideas`, `src/app/plans`, `src/app/progress`, and related API handlers.
  - Update navigation components (`src/components/shells/*`, `SiteFooter.tsx`) to link out to the STEVI domain.
  - Replace any portal previews on marketing pages with summaries that point to STEVI.
- Set up redirects on marketing site so legacy URLs (e.g., `/portal/ideas`) 301 to STEVI equivalents.
- Deploy STEVI SWA with Supabase env vars; smoke-test login, submissions, plan promotion, petition signing, and moderation.

## Supabase & Backend Preservation
- Keep the Supabase schema untouched; only augment via migrations coordinated with data team. Use Supabase MCP tool to verify existing policies before shipping.
- Ensure Edge Functions remain in `I.H.A.R.C-Public-Website/supabase/functions` but create a plan to mirror them into STEVI repo or manage via external deploy pipeline.
- Update environment documentation to clarify which repo holds `.env` values and how to share secrets between deployments.
- Monitor audit logs and rate limits after launch to confirm service continuity.

## Marketing Site Follow-Up
- After extraction, re-centre marketing copy on awareness, petitions, and contact info while pointing action CTAs to STEVI.
- Maintain snapshot stats (read-only) on marketing pages using small fetchers or static content so the marketing app no longer needs heavy portal dependencies.
- Document marketing/portal integration points in `I.H.A.R.C-Public-Website/docs/hand-off.md`.

## Deliverables & Milestones
- ✅ Inventory & architecture briefing (this document).
- 🟡 STEVI repo scaffolding & shared resource migration.
- 🟡 Portal route parity with legacy experience.
- 🟡 Client-centric upgrades and QA sign-off with outreach team.
- 🟡 Marketing site cleanup, redirects, and dual-launch comms.

The STEVI team should treat this briefing as the living source of truth—update it as plans solidify, especially when Supabase schema or shared infrastructure changes.


NOTES: 
Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

Always use the supabase mcp tool to view existing implementation. Follow existing patterns already implemented, i.e use of schemas outside of "public" such as "core", "inventory", "justice", etc. Always check first and do not rely on migration files as a reference. 
