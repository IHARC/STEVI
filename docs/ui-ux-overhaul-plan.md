# STEVI UI/UX Overhaul Plan & Tracker (Dec 2025)

Purpose: convert STEVI to a single, Material 3-compliant shell with role-aware workspaces and no duplicated navigation, while removing legacy/dead UI code. This plan incorporates the known issues (organization workspace omission, duplication of nav config vs `PortalAccess`, and capability enforcement gaps).

## Goals & Guardrails
- One global shell: top app bar + primary navigation rendered once at the root layout; no nested shells inside workspace content.
- Workspaces covered: Client, Staff, Admin, **Organization** (guarded), plus Reports and Settings sections in the same shell.
- Role/capability enforcement: derive visibility and routing from `PortalAccess` capability flags (server-derived), never UI-only hiding or JWT/app_metadata fallbacks.
- Material 3 only: use design tokens from `tokens/material3.json` via shared theme utilities; avoid ad-hoc colors/spacing.
- Modularity: shared layout primitives (AppShell, NavRail/Drawer, WorkspaceSwitcher, PreviewBanner, SecondaryNav) with zero hard-coded JSX nav scattered in pages.
- Clean-up: remove legacy/duplicate shells, dead components, and unused layout wrappers; do not leave shims or fallbacks.
- Compliance: keep audit logging and RLS intact; mutations still flow through existing audit/rate-limit pathways.

## Current Problems to Resolve
- Resolved 2025-12-01: single shell now lives in `src/app/(portal)/layout.tsx` with shared AppShell; no nested workspace shells.
- Resolved 2025-12-01: navigation continues to derive from `portal-access`/`primary-nav` with Org/Reports/Settings coverage; no duplicate configs.
- Resolved 2025-12-01: workspace visibility enforced via server-derived `PortalAccess` before layout render; UI hiding not relied upon.
- Resolved 2025-12-01: Organization workspace present in primary nav when permitted.
- Resolved 2025-12-01: shell/top/secondary nav updated to Material 3 tokens; ad-hoc widths/shadows removed.

## Codebase Audit (2025-12-01)
- Layout stack (post-refactor)
  - `src/app/layout.tsx` sets theme/analytics only.
  - `src/app/(portal)/layout.tsx` centralizes Supabase + `PortalAccess`, onboarding gate, command palette data, inbox, and renders the single `AppShell` across all portal routes (`dynamic = 'force-dynamic'`).
  - `src/components/shells/app-shell.tsx` hosts the top app bar, primary nav rail/bar/mobile, client nav, preview banner, inbox, and footer. `PortalShell` removed.
  - `src/app/(portal)/(admin|staff|org)/layout.tsx` now rely on `WorkspaceSectionLayout` for secondary nav/breadcrumbs only; they no longer fetch Supabase or render a shell.
- Shell components
  - `TopNav` (`src/components/layout/top-nav.tsx`) now accepts injected branding, user navigation, and command palette items (no Supabase instantiation).
  - `PrimaryNavRail/Bar/Mobile` (`src/components/layout/primary-nav.tsx`) continue to consume `buildPrimaryNavItems` and reflect Org + Reports/Settings with capability gating.
  - Secondary nav is `WorkspaceSectionNav` + `WorkspaceBreadcrumbs` (`src/components/layout/workspace-section-nav.tsx`, `workspace-breadcrumbs.tsx`), driven by `WorkspaceNav` from `portal-access`.
- Navigation sources of truth
  - Workspace + section blueprints live in `src/lib/portal-access.ts` (`CLIENT_NAV_BLUEPRINT`, `ADMIN/ORG/STAFF` workspace nav). Primary nav items come from `src/lib/primary-nav.ts` and already reflect Org + Reports/Settings.
  - Workspace resolution + preview logic live in `src/lib/workspaces.ts` and are exposed to the client via `WorkspaceContextProvider`.
- Preview-as-client
  - `isClientPreview` marks the client workspace as “preview” whenever another workspace is available; `ClientPreviewBanner` reads this from `WorkspaceProvider`.
- Onboarding gate
  - `src/app/(portal)/layout.tsx` still redirects non-staff/non-admin/non-org users to `/onboarding` until completed.
- Material 3 tokens
  - Tokens source: `tokens/material3.json` → `npm run sync:tokens` → `src/styles/main.css`. Guidance lives in `docs/design-tokens.md`. Keep all colors/spacing/typography pulled from these variables; avoid bespoke values.
- Duplication/debt addressed
  - Supabase + `PortalAccess` now load once per request in the portal layout; `TopNav` and workspace layouts reuse injected data.
  - Shell responsibility lives solely in `AppShell`; workspace layouts focus on section nav.
  - Secondary nav renamed from Admin* to workspace-neutral components.

## Target Architecture
- **Root AppShell (app/layout)**
  - M3 top app bar: logo/title (`STEVI · IHARC portal`), workspace context chip, search, `+ New`, notifications, avatar menu.
  - Primary nav rail/drawer: Home, Client, Staff, Organization, Admin, Reports, Settings; selection tied to route segments.
  - Responsive: rail+drawer on desktop, modal drawer or bottom nav on mobile.
- **Navigation source of truth**
  - Use the existing blueprint in `src/lib/portal-access.ts`; extend it to include Organization and Reports/Settings nodes as needed.
  - Expose a typed nav config consumed by shell components; no inline page-level nav definitions.
- **Workspace content layouts**
  - Each workspace page renders content only; may use secondary tabs/section nav within main area (no headers/nav duplication).
- **Preview-as-client mode**
  - Admin-accessible toggle; loads client workspace routes within the same shell and shows a persistent preview banner + exit action.

## Workspaces & Capability Mapping (via PortalAccess)
- Client workspace: requires client capability.
- Staff workspace: staff capability; optionally allow staff to see client workspace if permitted by `PortalAccess` flag.
- Organization workspace: org admin/rep capabilities; enforce RLS alignment.
- Admin workspace: admin capability with subordinate sections (clients/consents, access/people, content/comms, operations, inventory/donations already guarded elsewhere).
- Reports & Settings: gated by appropriate admin/staff capabilities (reuse existing flags or add explicit ones in `PortalAccess`).

## Component Refactors (shared, token-driven)
- `AppShell` (root)
- `TopAppBar` (M3 medium/large) with workspace chip, search, primary action, icons.
- `NavRail` / `NavDrawer` powered by blueprint data and capability filtering.
- `WorkspaceSwitcher` (role-aware, uses `PortalAccess`).
- `PreviewBanner` for “view as client”.
- `SecondaryNav` (tabs/segmented buttons) for intra-workspace sections.
- `PageScaffold` (padding, max width, surface tokens) for content areas.

## Cleanup & Deletion
- Remove any workspace-level `Layout`/`Shell` components that render headers/nav.
- Delete unused icons, routes, and styles tied to old shells.
- Consolidate duplicated nav data into the `portal-access` blueprint; remove alternate configs.
- Strip placeholder styling (custom colors, shadows) that deviates from Material 3 tokens.

## Implementation Steps & Tracking
- [x] **Audit** (workspace shell): enumerated layouts using `PortalShell` and mapped shell/nav duplication (see “Audit Findings”).
- [x] **Blueprint alignment**: nav remains sourced from `src/lib/portal-access.ts` + `src/lib/primary-nav.ts` (Org/Reports/Settings included); no parallel configs introduced.
- [x] **AppShell build**: `src/app/(portal)/layout.tsx` now renders the single `AppShell` (`src/components/shells/app-shell.tsx`) for all portal routes with `dynamic = 'force-dynamic'`.
- [x] **Data loading once**: `PortalAccess`, branding, command palette entities, inbox, and workspace quick actions load in the portal layout and are injected into `TopNav`/`AppShell`; `TopNav` no longer creates Supabase clients.
- [x] **Workspace refactors**: `src/app/(portal)/(admin|staff|org)/layout.tsx` are lightweight wrappers using `WorkspaceSectionLayout` (secondary nav + breadcrumbs only).
- [x] **Secondary navigation**: renamed to `WorkspaceSectionNav`/`WorkspaceBreadcrumbs`, fed by `WorkspaceNav` blueprints.
- [x] **Preview-as-client**: `WorkspaceContextProvider` retained at root; preview banner + workspace switcher still reflect `resolveDefaultWorkspacePath`.
- [x] **Styling pass**: shell/nav use Material 3 tokens (`bg-surface`, `shadow-level-*`, `max-w-page`); removed bespoke client-nav width.
- [x] **Cleanup**: removed `PortalShell`, duplicated shell wrappers, and redundant Supabase loading in header/workspace layouts.
- [ ] **QA**: `npm run lint` (2025-12-01) passes; manual role/responsive regression checks still pending.

## File-Level Refactor Map (starting points)
- Shell placement: `src/app/(portal)/layout.tsx` (single shell + data loading) with `src/components/shells/app-shell.tsx` replacing the old PortalShell.
- Primary nav: `src/lib/primary-nav.ts` + `src/components/layout/primary-nav.tsx` (Material 3-styled, capability filtered).
- Top bar: `src/components/layout/top-nav.tsx` (prop-driven header; no internal Supabase calls).
- Secondary nav: `src/components/layout/workspace-section-nav.tsx` + `workspace-breadcrumbs.tsx`, consumed via `WorkspaceSectionLayout`.
- Workspaces + preview: `src/lib/workspaces.ts`, `src/components/providers/workspace-context-provider.tsx`, `client-preview-banner.tsx`.
- Capability/nav blueprint: `src/lib/portal-access.ts` (single source) and `src/lib/workspaces.ts` for defaults/quick actions.
- Styling tokens: `docs/design-tokens.md`, `tokens/material3.json`, `src/styles/main.css`, `tailwind.config.ts`.

## Audit Findings (2025-12-01, post-refactor)
- Duplicate shells: replaced by single `AppShell` in `src/app/(portal)/layout.tsx`; admin/staff/org layouts no longer render shells.
- Repeated data loading: consolidated in portal layout; `TopNav` receives injected branding/user nav/command palette/inbox data.
- Secondary nav naming: renamed to `WorkspaceSectionNav`/`WorkspaceBreadcrumbs` to reflect shared use across workspaces.
- Primary nav coverage: `src/lib/primary-nav.ts` continues to cover Home/Client/Staff/Admin/Org/Reports/Settings with capability gating.
- Workspace resolution + preview: `WorkspaceContextProvider` still drives preview state and default paths from `src/lib/workspaces.ts`.
- Onboarding gate: preserved in `src/app/(portal)/layout.tsx` for client workspace when no staff/admin/org capabilities.

## Risks & Constraints
- Supabase schema is shared with STEVI OPS/marketing; do not alter schema or RLS during UI refactor. Keep `dynamic = 'force-dynamic'` where auth/RLS needs it.
- All mutations must continue to flow through audit/logging and rate-limit hooks; shell changes must not bypass `PortalAccess` or `logAuditEvent` usage inside actions.
- Registration/onboarding guard in `src/app/(portal)/layout.tsx` must remain to prevent unauthenticated or unapproved users from reaching client routes.
- Avoid new role checks in the client; rely on `PortalAccess` flags and existing RPCs (`get_user_roles`, `refresh_user_permissions`).
- Keep marketing (public) routes out of the authenticated shell; they stay on the public layout.

## Testing / Verification
- Run: `npm run lint`, `npm run typecheck`, `npm run test`, `node build.js` (build includes eslint + Next build with webpack and SWC native disabled).
- Manual QA: client-only, staff-only, org-only, admin accounts; mobile vs desktop nav; onboarding redirect; preview banner exit; inbox/quick actions per workspace; command palette entries scoped to capabilities.
- Visual pass: confirm Material 3 color/spacing/typography tokens (no custom rgb/hex), single top bar + nav rail/drawer, secondary nav confined to content area.

## Acceptance Criteria
- Single AppShell wraps all authenticated routes; no page renders a second header/nav.
- Navigation is generated solely from `portal-access` blueprint and filtered by `PortalAccess` capabilities.
- Organization workspace appears in nav when capability allows; hidden otherwise.
- Preview-as-client runs within the same shell with a clear exit and banner.
- All visible components use Material 3 tokens for color, typography, spacing, and shape.
- Legacy/duplicate shell components and nav configs are removed from the repo.
