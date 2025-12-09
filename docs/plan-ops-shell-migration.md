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

## Goals
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

## Work Plan (one shot)
1) **Area model**
   - Update `PortalArea` in `src/lib/portal-areas.ts` to new enums; remap `inferPortalAreaFromPath` to `/ops`, `/ops/org`, `/ops/hq`; drop workspace catch-all.
   - Adjust `resolveLandingArea/Path`, `requireArea`, preview handling, and `getPortalRequestContext` to use new areas and paths.
2) **Routing & paths**
   - Route group `(ops)` with `/ops/...` paths across pages, actions (`revalidatePath`), and links.
   - Move/alias layout to `src/app/(ops)/layout.tsx` with updated imports/guards.
   - Update login redirects (`/login?next=/ops/...`) in pages/actions.
3) **Shell/theme rename**
   - Change root class to `ops-shell` in `AppShell` and `theme` file; `src/styles/theme.ops.css` provides ops tokens and imports.
   - Update descriptive copy in PageHeaders (“Operations”) and preview banner text.
4) **Navigation rebuild**
   - Replace `NAV_SECTIONS` with Ops sections:
     - `ops_frontline`: Today, Clients, Programs, Supplies, Partners (gated by existing capability flags renamed if needed).
     - `ops_org`: Organization hub (`/ops/org`), members/invites/settings; only for org admins/IHARC admins.
     - `ops_hq`: HQ hub (`/ops/hq`) for IHARC admins only; groups for Global Settings, Content & Notifications, Organizations (list), Inventory/Donations, Operations (users/permissions/attention queue).
   - Update `workspace-rail` (rename component/file to `ops-rail` if desired) to pull from new nav sections.
   - Update quick actions and command palette builders for new paths/areas.
5) **IHARC HQ hub**
   - Create `/ops/hq` entry page using existing admin components (policies/resources/public settings/notifications/marketing/inventory/donations/operations).
   - No acting-org requirement; hide acting-org badge in TopNav when activeArea is `ops_hq`.
6) **Org hub tightening**
   - Keep `/ops/org` pages; ensure guards require acting org for org admins; allow IHARC admins to specify org via query or selector.
   - Update `org-tabs` links to `/ops/org/*`.
7) **Frontline rail**
   - Update Today/Clients/Programs/Visits/Supplies pages to new paths, breadcrumbs, headers.
   - Ensure `resolveQuickActions` and buttons use `/ops/...`.
8) **Primary/secondary nav & user menu**
   - Update `primary-nav`, `user menu` profile link, TopNav acting-org badge visibility, and client preview CTA to use new paths/labels.
9) **Tests & fixtures**
   - Update Vitest suites (`portal-navigation.test.ts`, `paths.test.ts`, `portal-access.test.ts`, `inventory/auth.test.ts`) to new paths/area labels.
   - Adjust any path normalization expectations (`stripRouteGroups`).
10) **Docs & README**
    - Refresh `README.md`, `docs/architecture/shells.md`, `docs/navigation-ownership.md` with new naming/areas and the no-back-compat rule.
    - Mention dead links acceptable during migration; remove references to “workspace”.
11) **Quality gates**
    - Run `npm run lint`, `npm run typecheck`, `npm run test`. Update snapshots if any. No redirects/fallbacks added.

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
