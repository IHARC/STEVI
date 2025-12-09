# Operations Shell Migration Plan (one-shot, no back-compat)

## Context
- Current Operations shell serves IHARC staff/volunteers/admin and external org admins/staff under `/ops/*`; area detection now distinguishes `/ops`, `/ops/org`, `/ops/hq`.
- IHARC requires a dedicated global Operations space (IHARC super-admins) separate from tenant org admin and frontline rails.
- Pre-production: **no backwards compatibility, no fallbacks, no dual routes, dead links are acceptable**. Remove or replace old routes instead of redirecting or shimming.
- Existing code touchpoints:
  - Layout/rail/theme: `src/app/(ops)/layout.tsx`, `components/workspace/shells/app-shell.tsx`, `components/workspace/layout/ops-rail.tsx`, `src/styles/theme.ops.css`
  - Area/nav/commands: `src/lib/portal-areas.ts`, `src/lib/portal-navigation.ts`, `src/lib/portal-access.ts`, `src/lib/primary-nav.ts`, `src/lib/command-palette.ts`
  - Org hub: `src/app/(ops)/ops/org/**`
  - Admin modules reused for HQ: `src/app/(ops)/ops/hq/**` and `components/workspace/admin/**`
  - Client preview/shared chrome: `components/shared/layout/top-nav.tsx`, `components/shared/layout/client-preview-banner.tsx`, `components/shared/layout/app-navigation.tsx`, `components/shared/providers/*`
  - Tests/docs: `src/lib/portal-navigation.test.ts`, `src/lib/paths.test.ts`, `src/lib/portal-access.test.ts`, `docs/architecture/shells.md`, `docs/navigation-ownership.md`, `README.md`

## Status
- COMPLETE as of 2025-12-09. Lint/typecheck/test all pass (`npm run lint`, `npm run typecheck`, `npm run test`).

## Goals (all delivered)
1) Rename the workspace shell to **Operations** (short **ops** in URLs, classnames, labels).
2) Split areas: `ops_frontline`, `ops_org`, `ops_hq`, `client`. Preserve explicit guards per area; remove the “workspace catch-all”.
3) Add an IHARC HQ hub (global admin) with navigation surface and overview under `/ops/hq`.
4) Keep tenant Org hub under `/ops/org` scoped to acting org; IHARC admins can jump in via selector.
5) Frontline rail becomes `/ops/*` (Today/Clients/Programs/Visits/Supplies, etc.) gated by capabilities.
6) Update navigation/commands/quick actions/acting-org indicator to respect new areas.
7) Update copy/themes/tests/docs; remove old “workspace” terminology and paths. No legacy redirects.

## Non-Goals
- No schema changes; reuse existing Supabase roles/RPCs.
- No new bespoke UI primitives; use existing shared/shadcn components.
- No compatibility routes or preview shims beyond the new scheme.

## Naming & URLs
- Shell name: **Operations**.
- Short prefix: `/ops`.
- Areas (suggested enum): `ops_frontline`, `ops_org`, `ops_hq`, `client`.
- Theme scope class: `ops-shell`.
- Profile path: `/ops/profile`.
- Preview CTA remains “Preview client portal” linking to `/home?preview=1`.

## Execution (one shot, all done)
1) **Area model** – [done] `PortalArea` now `ops_frontline|ops_org|ops_hq|client`; inference/landing/guards and request context updated; preview handled; no workspace catch-all.
2) **Routing & paths** – [done] Route group renamed to `(ops)` with `/ops/...` across pages/actions/links; layout lives at `src/app/(ops)/layout.tsx`; login redirects use `/ops/...`.
3) **Shell/theme rename** – [done] Root class `ops-shell`; ops tokens in `src/styles/theme.ops.css`; PageHeaders/top chrome copy updated; preview banner copy refreshed.
4) **Navigation rebuild** – [done] Ops nav sections for frontline/org/HQ; ops rail component; quick actions + command palette rebuilt to new paths/areas.
5) **IHARC HQ hub** – [done] `/ops/hq` overview with notifications, attention queue, inventory/donations, and website panels; acting-org badge hidden on HQ.
6) **Org hub tightening** – [done] `/ops/org` guarded by acting org; org selector allowed for IHARC admins; tabs/links updated to `/ops/org/*`.
7) **Frontline rail** – [done] Today/Clients/Programs/Visits/Supplies/Partners/Profile moved to `/ops/*` with visit-first copy and breadcrumbs.
8) **Primary/secondary nav & user menu** – [done] Profile link at `/ops/profile`; TopNav acting-org only on frontline/org; client preview CTA intact.
9) **Tests & fixtures** – [done] Vitest suites updated; path stripping expectations adjusted.
10) **Docs & README** – [done] README, architecture, navigation ownership, Front Door/App Service notes updated to ops naming; dead-link tolerance noted.
11) **Quality gates** – [done] `npm run lint`, `npm run typecheck`, `npm run test` passing (Dec 9, 2025).

## Risks / Calls
- Bulk path rename is pervasive; rely on `rg` + type errors to catch stragglers.
- Ensure `normalizePathFromHeader` still strips route groups after folder rename.
- Acting-org logic: keep auto-select behavior but ensure it doesn’t leak into HQ.

## Verification Checklist (post-change)
- IHARC admin hits `/ops/hq` and sees HQ nav; acting-org badge hidden.
- Org admin hits `/ops/org` and can manage only their org; blocked from HQ.
- Staff/volunteer hits `/ops/today` etc.; redirect to `/home` if no ops access.
- Client preview still works from ops TopNav → `/home?preview=1`; banner shows exit back to `/ops/today`.

## Rollback (if needed)
- Revert commit; no redirects maintained. Since pre-prod, breakage is acceptable over hidden shims.
