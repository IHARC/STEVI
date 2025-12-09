# STEVI Workspace Shell: One-Shot Implementation Plan (Workspace roles: staff, volunteers, org admins)

## Scope & Constraints
- Workspace shell users = staff, volunteers, org admins (Organization hub is admin-only but within workspace). **Client shell untouched**.
- No backward-compat shims or redirects; remove legacy nav/routes instead of hiding them.
- Left rail must show **hubs only** (no sublinks/actions); max ~6 visible.
- “Visit is the container”; supplies & referrals only within Visit/Client contexts.
- Keep data fetchers/services intact; focus on IA, routing, and page composition.
- Acting org policy: if user belongs to one org, auto-select; if none selected and multiple available, block creating Visit/Referral until set.

## Current State (quick read)
- Workspace layout: `src/app/(workspace)/layout.tsx` uses `AppShell` with `buildPortalNav` providing grouped nav items.
- Nav config lives in `src/lib/portal-navigation.ts`; includes sublinks/actions (e.g., New Visit, Tasks) and mixes admin/staff routes.
- Top bar: `components/shared/layout/top-nav.tsx` supports a mega menu for client preview and shows acting-org badge.
- Rail component for workspace currently `AppNavigationDesktop` (sublinked sections). Client shell shares it.
- Key hub content today:
  - Today: `src/app/(workspace)/workspace/today/page.tsx` (cards/queues).
  - Clients: admin directory at `/admin/clients`; staff “cases” at `/staff/cases`; no unified Journey-first client profile.
  - Programs split across `/staff/schedule`, `/staff/outreach`, `/admin/appointments`, `/admin/warming-room`, etc.
  - Supplies inventory at `/admin/inventory/*`; donations/reconciliation separate.
  - Partners directory at `/admin/organizations`; referrals elsewhere.
  - Organization hub at `/org/*` plus admin content.

## Target IA (rail hubs)
1) Today  
2) Clients  
3) Programs  
4) Supplies  
5) Partners  
6) Organization (admins only)  
Optional: Reports (must be **either** rail hub **or** palette/search-only; never both to avoid >6 rail items).

## High-Level Workstream Order
1. **Nav Model Rewrite**
   - Replace `NAV_SECTIONS` in `src/lib/portal-navigation.ts` with flat hub items only (one group per hub, no actions/sublinks).
   - Restrict `resolveQuickActions` to contextual actions surfaced in pages/command palette (not rail).
   - Ensure `buildPortalNav` still filters by role, but hidden hubs are removed not nested.
   - Update `inferPortalAreaFromPath`/landing logic only if new `/workspace/{hub}` routes are added.

2. **Workspace Rail Component**
   - Add `components/workspace/layout/workspace-rail.tsx` (or similar) rendering flat hub list; 44px targets; icons optional.
   - Swap into `components/workspace/shells/app-shell.tsx` for workspace/staff/admin layouts. Leave `AppNavigationDesktop` for client shell use.
   - Keep inbox + footer layout intact.

3. **Top Bar Simplification (workspace area)**
   - In `top-nav.tsx`, disable mega menu for workspace area; keep search/command palette, notifications (InboxPanel), Help, user menu, acting-org badge.
   - No nav duplication up top; Today/Clients/etc. live only in rail and page tabs/cards.
   - Command palette: remove hard cap; rely on filtering/ranking/grouping by hub.

4. **Routing & Pages by Hub**
   - Create new workspace hub routes (move/rename old ones; delete duplicates, no redirects):
     - `src/app/(workspace)/workspace/today/page.tsx`: tighten to 3–6 cards; CTAs: New Visit, Find/Create person; role-scoped queues (follow-up Visits, Tasks, Appointments, Intake, Shifts). Rows link directly to Visit or Client.
     - `src/app/(workspace)/workspace/clients/page.tsx`: directory + shallow filters; segmented toggle (Directory | My caseload **or** Activity feed).
     - `src/app/(workspace)/workspace/clients/[id]/page.tsx`: Journey timeline default; filters All | Visits | Tasks | Referrals | Supplies | Appointments; header shows identity + consent/visibility “created by org”; primary CTA New Visit; 2–3 quick actions (e.g., Add referral, Add note). Timeline must surface anything that happened to/with client.
     - `src/app/(workspace)/workspace/programs/page.tsx`: program cards with schedule badges + “Today’s programs” section.
     - `src/app/(workspace)/workspace/programs/[id]/page.tsx`: roster/attendance, schedule/shift context, Start Visit in this program CTA, shift logs quick link. Outreach becomes a program type here (no separate hub).
     - `src/app/(workspace)/workspace/supplies/page.tsx`: landing with stock summary, low-stock alerts, reconciliation entry; tabs/cards for Items & locations, Donations (inventory-related), Reconciliation/Audit. No “give items” workflows here.
     - `src/app/(workspace)/workspace/partners/page.tsx`: partner directory + services catalog + agreements/POCs. No referral creation; only destination selection.
     - Organization: keep `/org` but present as hub landing with cards for Users, Roles/permissions, Tenant settings, Brand/Website, Policies, Integrations, plus guarded controls (default landing per role, pinned shortcuts max 3, label aliases, Simple mode toggle).
     - Reports (optional): if included, either rail hub or command palette only—avoid duplicating.

5. **Visit-First Enforcement**
   - Ensure New Visit entry points exist only on Today, Client profile, Program detail (remove rail action).
   - Supplies given/used logged inside Visit forms (`workspace/visits/*`); verify other routes don’t surface supply adjustments outside Visit.
   - Referrals created only from Client or Visit flows; remove “referrals” actions from Partners/rail.
   - Single primary New Visit CTA per screen (page header), not duplicated in rail + cards.

6. **Secondary Navigation Patterns**
   - Within hubs use tabs/segmented controls/cards for subpages (max 6 tabs). No nested rail.
   - Adjust existing pages to adopt these patterns (e.g., Clients directory toggle, Supplies tabs, Organization cards).

7. **Link & Command Palette Updates**
   - Update all internal links/CTA hrefs to new `/workspace/{hub}` paths.
   - Update command palette builders to include hub entries + key actions (New Visit, Find/Create person, Start Visit in program) without duplicating rail.
   - Remove legacy paths from palette and quick actions.

8. **Cleanup & Removals**
   - Delete obsolete `/admin/*` and `/staff/*` pages replaced by new hub routes (no redirects).
   - Remove rail actions like `/workspace/visits/new` item and task/appointment sublinks.
   - Strip any “Outreach” hub; rehome into Programs.
   - Enforce no orphan pages: every page must be reachable from a hub landing, a client page, or a program page (add test/checklist).

9. **Verification**
   - Add/update Playwright/Vitest smoke tests: rail renders ≤6 hubs, no sublinks/actions; New Visit accessible from Today/Client/Program; supplies/referrals absent outside Visit/Client.
   - Manual checklist: rail hubs, top bar minimal, journey timeline default on client profile, supplies/referrals constrained, no mega menu on workspace, no orphan pages.
   - Provenance/visibility surfaced on every Journey item and Visit/Referral: “Created by [Org]” + “Visible to [scope]”.
   - Acting-org policy validated: block Visit/Referral creation when org unset and multi-org; auto-select when only one org.

## File Touch Map (anticipated)
- `src/lib/portal-navigation.ts` (hub definitions, quick actions)
- `src/lib/portal-areas.ts` (path inference if new routes)
- `src/components/workspace/shells/app-shell.tsx` (swap rail)
- `src/components/workspace/layout/workspace-rail.tsx` (new)
- `src/components/shared/layout/top-nav.tsx` (workspace mega-menu off, minimal actions)
- `src/lib/primary-nav.ts` (ensure only settings in global nav)
- Hub pages under `src/app/(workspace)/workspace/*` (add/replace Clients, Programs, Supplies, Partners, Organization landing, Reports optional)
- Remove/move legacy pages in `src/app/(workspace)/(admin|staff)` superseded by new hubs
- Command palette builders in `src/lib/portal-access.ts` / `src/lib/command-palette.ts` as needed
- Tests under `playwright/` or `src/app/(workspace)/**/__tests__`

## Acceptance Mapping
- Rail hubs only, no sublinks/actions → nav rewrite + new rail component.
- Each hub has landing with internal tabs/cards → new hub pages.
- New Visit only from Today/Client/Program → CTA placement updates.
- Supplies/referrals only inside Visit/Client → audit links/forms; remove other entry points.
- No mega menu, no legacy nav/routes → top-nav change + route cleanup.
- Provenance + visibility stamped on Journey items/Visits/Referrals → page/component updates + tests.
- No orphan pages → navigation reachability test.
- Command palette uncapped → palette builder change, rely on filtering.
- Hub count discipline → Reports either rail or palette-only, not both.

## Risks / Watch-outs
- Shared `AppNavigationDesktop` also used by client shell; don’t break client. Introduce workspace-specific rail instead of altering shared one.
- Ensure RLS-gated pages continue to enforce access (reuse existing guards in layouts).
- Update all hyperlinks to avoid 404s after route moves (cases, intake, schedule, inventory).
- Programs hub must stay constrained to program/shift/outreach context; don’t turn it into a catch-all.

## Ready-to-Start Checklist
- Node 24 env ready; no DB schema changes required.
- Decide final hub route prefixes under `/workspace/{hub}` before refactors.
- Plan deletions for replaced `/admin/*` `/staff/*` routes to avoid dangling imports/tests.
