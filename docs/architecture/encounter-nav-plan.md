# Visit-First Navigation & UX Standard (2025-12-08)

Purpose: lock the product to a single-shell, visit-first IA that is intuitive for seniors/volunteers, supports multi-org continuum-of-care, and prevents future regressions by Codex agents.

Scope: applies **only** to the workspace shell (staff/admin/org). The client portal (`src/app/(client)`) remains untouched; do not alter its nav, layout, or copy when implementing this plan.

Role model: librarians/volunteers are workspace users with restricted roles (not a separate shell); their navigation and surfaces are minimized but follow the same structure.

## Non-negotiable rules
1) **Clients are the spine** — Client Journey is the canonical record.
2) **Visit is the universal interaction record.** Internal model can stay `encounter`, but surfaced UI copy uses “Visit.” Every frontline action (notes, tasks, appointments, supplies given, referrals, vitals) happens inside a Visit.
3) **Supplies distribution is recorded inside Visits.** The Supplies hub is only for stock/reconciliation.
4) **Referrals are created from the client/Visit.** Partners hub is directory/config only.
5) **One shell, one rail.** No secondary “workspace” navs, no top mega menu, no duplicate surfaces.
6) **Role/permission gating removes nav affordances.** In-context actions may optionally show a single “locked” affordance pointing to Organization → Access; do not scatter disabled buttons.

## Terminology
- Visit: any client interaction (data model may still use `encounter`).
- Program: where/why a Visit occurs (drop-in, food bank shift, outreach route, clinic, warming room, etc.).
- Client Journey: timeline of all Visits, referrals, tasks, and major state changes.
- Acting org: the organization the user is operating as; must be visible in the workspace chrome.
- UI label: “Visit” (optionally tenant-aliasable later); internal model may remain `encounter` until refactor.

## Information Architecture (rail, single shell)
- Today (role-scoped work queue; always includes “Find person / Find or create person”)
- Clients (Client list + Client Journey)
- Programs (rosters/contexts; start Visits in context)
- Supplies (stock, reconciliation; never frontline distribution)
- Partners (directory/config for referral destinations)
- Organization (admins only: users/roles/tenant settings/website & brand, policies)
- Optional: Reports (if widely used) rendered as a rail item or palette-only; choose one, not both.

### Navigation implementation (code targets)
- `src/lib/portal-navigation.ts`: replace multi-area sections with a single “workspace” area that defines the rail above. Map existing pages into these hubs; add missing pages (donations, branding/website, templates, help) to their hubs.
- `src/components/shared/layout/top-nav.tsx`: remove the top mega menu render when the rail is present.
- `src/components/shared/layout/app-navigation.tsx`: allow `globalNavItems` to render (Quick links) or remove their builder if unused; remove the injected “Quick access” section; keep mobile Sheet.
- `src/lib/portal-access.ts`: remove or set a very high command palette cap (>=200); include all hub tabs; group labels should prefix with hub name; filter by permission before inclusion.
- **Client shell isolation:** do not import workspace nav into `src/app/(client)`; keep `client-navigation.ts` as-is. Respect ESLint import boundaries between `components/client/**` and `components/workspace/**`.

## UX patterns to enforce
- Primary CTA on Today and Client pages: **New Visit** (pre-fills type from role/context).
- Today and Clients must also surface **Find person / Find or create person** as a first-class control (especially for librarian/volunteer roles).
- Visit screen: panels for notes, tasks, appointments, supplies used, referrals, attachments; role-gated panels (e.g., Clinical, Justice).
- Consent/sharing badge on Client header and Visit header; indicates cross-org visibility.
- Acting org indicator in the workspace chrome; every timeline item and Visit/Referral shows “Created by [Org]” and visibility scope.
- Breadcrumb pattern: Client → Visit (type) with a short descriptor chip.
- Rail labels use words; icons optional; 44px min height; active state always visible.
- Quick actions (2–3 max) live in page headers, not in the rail.

## Feature gating (must hide, with a single exception)
- Nav items are filtered server-side per access (`buildPortalNav`/`requireArea`); do not render items the user cannot access.
- In-context actions: prefer hiding; if exposure is needed for support/training, show one locked affordance with “Ask your admin for access,” ideally centralized in Organization → Access, not duplicated across pages.
- Role-based landings: Today is role-scoped; librarians/volunteers see only intake/referral affordances.

## Data model expectations (for engineers)
- Visit (encounter) fields: id, client_id, program_id, org_id, location, type, created_by, timestamps, consent/sharing flags, acting_org_id (if different from creator’s primary org).
- Child collections: notes, tasks, appointments, referrals, vitals/clinical, supplies_used, attachments, tags.
- Supplies_used drives stock adjustments; Supplies hub handles inventory counts and reconciliation.
- Referrals reference client_id and (optionally) encounter_id/visit_id; Partners hub stores destinations and agreements; include created_by_org.

## Future-proofing (examples)
- Food Bank: add Visit types “Food Bank” and panels for parcel/line items; keep under Programs context; no new rail item.
- Justice/Medical: add role-gated panels inside Visit; avoid new top-level nav.
- New Programs: extend Programs roster + Visit types; do not create parallel modules.

## Implementation steps (one-shot sequence)
1) Update `NAV_SECTIONS` to the rail above; remove Staff/Admin/Org sectional split and any legacy entries that don’t map.
2) Remove the top mega menu render from `TopNav`; keep top bar minimal (logo, search/command palette, notifications, help, user menu, optional preview link).
3) Strip the “Quick access” injected section from `useAugmentedSections`; move quick actions to page headers.
4) Standardize UI copy to **Visit** (not Encounter) in all surfaced strings; keep internal `encounter` type if refactors are high-risk, but prefer renaming when touched.
5) Ensure role/permission filters remove nav items and header buttons; add tests around filtered nav and hidden/locked CTAs per role.
6) Remove command palette cap (or set >=200) and prefix items with hub names; include all hub tabs; permission-filter creation actions.
7) Fold website/branding/policies under Organization as “Website & Brand” and “Policies” (distinct cards/pages); avoid “Marketing & Policy” label.
8) Remove obsolete routes/components left over from multi-workspace nav.
9) Update docs (`docs/navigation-ownership.md`) to point to this plan as the sole source of truth.
10) Add org provenance UI: acting org indicator in chrome; per-item “Created by [Org]”; visibility scope labels on Visits/Referrals.
11) Add no-orphan-routes test to ensure every workspace route is reachable via rail, in-hub link, or command palette.
12) Run lint/type/test suites; add/adjust Playwright smoke to assert: no mega menu, nav filtered by role, Visit CTA present, Supplies absent from frontline flow, acting-org indicator present.

## Testing checklist
- `npm run lint -- --max-warnings=0`
- `npm run test` (unit: nav filtering, requireArea guards, permission-based CTA hiding)
- `npm run e2e` (Playwright):
  - Low-role user sees only Today/Clients; cannot see Organization/Partners.
  - New Visit flow from Today and Client; supplies usage recorded inside Visit.
  - Referral created from Client/Visit, not from Partners.
  - No top mega menu; rail present on desktop; mobile Sheet works.
  - Acting org indicator visible; timeline items show provenance.
  - Command palette returns all hubs/tabs (no silent truncation).
  - No orphan routes: every workspace route is reachable via rail hub, in-hub link, or command palette.

## Enforcement & ownership
- Keep ESLint import boundaries (client/workspace/shared) intact.
- Update CODEOWNERS to require review on `src/lib/portal-navigation.ts`, `top-nav`, `app-navigation` for nav changes.
- Future Codex agents must follow this document; deviations require an ADR. Remove legacy code when replaced; back-compat is not required for this pre-production app.
