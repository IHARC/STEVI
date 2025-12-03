# Workspace Navigation Rebuild Plan

Date: 2025-12-01

## Constraints / reminders
- Respect AGENTS.md: no outbound network without approval; prefer MCP; do not change Supabase schema/RLS; keep audit + rate limits intact.
- Stack: Next.js 16 (App Router), React 19, Tailwind with Material 3 tokens. Build via `node build.js` (runs `eslint .` then `next build`).
- Auth: use `createSupabaseServerClient` in actions/route handlers for any cookie writes; RSC client is read-only.
- Keep surfaces dynamic (`dynamic = 'force-dynamic'`) for authed content.
- Navigation UX principle (desktop/tablet): persistent global top bar with workspace tabs and global tools; separate workspace-scoped left drawer showing only the active workspace’s pages. Mobile uses sheet/modal but follows the same global-vs-workspace separation.

## Current state (audit)
- Navigation data lives inside `src/lib/portal-access.ts` (`CLIENT_NAV_BLUEPRINT`, `ADMIN/ORG/STAFF` blueprints). Icons are required on groups; items lack per-feature flags beyond guards/roles. Blueprint does not include client workspace and is limited to existing links.
- Drawer component: `src/components/layout/workspace-drawer.tsx` renders desktop + sheet mobile drawers for non-client workspaces only. Styling uses primary tones (not M3 drawer spec) and lacks global bottom pinning for client workspace.
- App shell: `src/components/shells/app-shell.tsx` shows drawer only when `activeWorkspace !== 'client'`; client uses top bar pills via `WorkspaceClientNav`.
- Breadcrumb/layout wrapper: `WorkspaceSectionLayout` (`src/components/layout/workspace-section-layout.tsx`) wraps admin/staff/org layouts with breadcrumbs and quick actions. Page headers are bespoke per page (e.g., `src/app/(portal)/admin/page.tsx`, `src/app/(portal)/staff/page.tsx`). Stat tiles are ad-hoc inside pages (no shared component).
- Routes available today (non-exhaustive):
  - Admin: `/admin` (operations overview), `/admin/clients`, `/admin/consents`, `/admin/users`, `/admin/permissions`, `/admin/profiles`, `/admin/organizations`, `/admin/resources`, `/admin/policies`, `/admin/notifications`, `/admin/inventory`, `/admin/donations`, `/admin/marketing/*` (navigation, branding, home, supports, programs, footer).
  - Staff: `/staff` (overview), `/staff/caseload`, `/staff/cases`, `/staff/intake`, `/staff/appointments`, `/staff/outreach`, `/staff/schedule` (+ case detail routes).
  - Client: `/home`, `/appointments`, `/documents`, `/cases`, `/support`, `/profile`, `/profile/consents`.
- Missing versus requested nav items (need stubs): admin approvals queue, warming room ops, service rules/algorithms, templates/tests, website content inventory, outreach inventory overview, items & stock levels split, admin website “public resources” entry, staff tasks (my/team), staff outreach schedule/map, staff encampment list, staff shift logs, client messages, client resources, appointments past/upcoming views.
- Icons: `src/lib/app-icons.ts` only defines `home`, `dashboard`, `shield`, `chart`, `settings`, `building`, `briefcase`, `users`, `notebook`, `globe`, `megaphone`, `boxes`. New nav items will need additional icons added here (keep names concise).

## Plan to implement
1) **Create central workspace nav blueprint file**
   - New `src/lib/workspace-nav-blueprints.ts` exporting data-only blueprints per workspace: `workspaceId`, `label`, `groups[]`, `items[]` with optional `icon`, `match` prefixes, and `requires` guards (role/feature flag callbacks). Include `defaultRoute` per workspace (admin `/admin/operations`, staff `/staff/overview`, client `/home`).
   - Populate groups/items per request; map to existing routes where available (see audit list) and mark new routes that need stubs.
   - Keep client workspace included so drawer can render for client.

2) **Refactor portal-access to consume blueprint**
   - Replace inline blueprints with imports from the new file; update types to allow optional icons and `match` arrays.
   - Ensure `resolveWorkspaceNavForShell`, command palette builders, user menu links, and client links use the new shapes. Preserve permission checks via guard callbacks; avoid UI-only gating.

3) **Add stub routes for missing links**
   - Create minimal pages (dynamic) with standardized headers for: `/admin/operations` (alias root), `/admin/approvals`, `/admin/warming-room`, `/admin/service-rules`, `/admin/templates`, `/admin/website` (public resources), `/admin/content-inventory`, `/admin/inventory/overview`, `/admin/inventory/items`, `/admin/inventory/donations-mapping` (or similar slugs), `/staff/tasks`, `/staff/tasks/team`, `/staff/outreach/schedule`, `/staff/outreach/encampments`, `/staff/shifts/logs`, `/client/messages`, `/client/resources`, `/appointments/past` & `/appointments/upcoming` views if needed. Keep content minimal but wired to audit/logging patterns where applicable.

4) **WorkspaceDrawer redesign**
   - Implement single `WorkspaceDrawer` that renders for all authenticated workspaces (client/staff/admin). Strictly follow M3 navigation drawer spec/tokens: surface or surfaceContainerLowest background, selected state on `secondaryContainer`, text on `onSecondaryContainer`, standard drawer radius/shape, divider before global items.
   - Drawer content is workspace-scoped only; global controls live in the top bar (no pinned global footer). Support partial path matches via `href` + `match` prefixes. Support mobile sheet toggle via existing hamburger.

5) **Integrate top bar + drawer into AppShell**
   - Keep a global top app bar on desktop/tablet that always shows branding, workspace tabs, user menu, command palette/quick create, and other global tools; no workspace-specific links in the top bar.
   - Always render the workspace drawer for the active workspace (client/staff/admin) on desktop/tablet; hide only when the workspace has no items. Hamburger opens the same drawer on mobile.
   - Remove/replace `WorkspaceSectionLayout` usage; pages render directly within the shell and rely on the standardized page header component instead of breadcrumbs.

6) **Standardize page headers**
   - Create shared `WorkspacePageHeader` component (eyebrow/label, title, subtitle, primary & secondary actions) using Material 3 button variants (filled + tonal). Replace bespoke headers in `/admin`, `/admin/*`, `/staff`, `/staff/*`, `/client` landing routes. Ensure titles align with nav item labels for selection coherence.

7) **Shared stat tile component**
   - Extract stat tile used on admin operations page into `components/ui/stat-tile.tsx` (or similar) using M3 tokens. Reuse across admin operations, admin website, admin inventory, and any new dashboards. Provide props for tone (default/warning/info) and optional icon/footnote.

8) **Route selection & defaults**
   - Use Next.js `usePathname` to compute active nav item with prefix matching (`href` or `match[]`). Define `defaultRoute` per workspace and ensure workspace selection / redirects use it (update `resolveDefaultWorkspace` if needed). Map `/admin` to `/admin/operations` without breaking existing data fetches.

9) **Cleanup**
   - Remove/deprecate components no longer needed after drawer/header changes: `WorkspaceSectionLayout`, `WorkspaceBreadcrumbs`, any unused `portal-nav*` remnants. Update imports accordingly.
   - Update `app-icons` with new names used in blueprints.
   - Run `npm run lint` and `npm run typecheck`; fix any references.

10) **QA checklist**
   - Manual: client login shows drawer with client items; staff login hides admin links; admin login shows all groups and pinned global items; mobile drawer opens/closes correctly.
   - Verify command palette still lists nav items and new stubs.
   - Confirm headers match drawer selection when navigating (Operations -> Operations overview, Website -> Website, Inventory -> Inventory overview, etc.).
