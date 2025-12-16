# STEVI Navigation & App Structure Standard

Last updated: 2025-12-13  
Owner: IHARC / STEVI team  
Scope: **App-wide** navigation and information architecture (IA) standard going forward.

## Purpose
Establish a single, durable navigation standard for STEVI that scales to many features, supports multiple user types with gating, and avoids “stacked nav” UI (multiple tab rows / competing controls).

This document is the source of truth for:
- Navigation hierarchy and allowed patterns
- Shell separation (Client vs Ops)
- Role/tenant/capability gating rules
- Implementation phases and acceptance criteria

## Product context (why this matters)
STEVI is a multi-tenant portal enabling an integrated continuum of care across organizations. Client data visibility is **cross-org by default** when consent allows. IHARC operates STEVI and also functions as an organization within the same tenant model.

Key constraints:
- Navigation must be obvious and low-cognitive-load (many users are volunteers / low-tech).
- UI must adhere to shadcn/ui token system (`src/styles/theme.css`, `tailwind.config.ts`).
- UI hiding is never security: enforce authorization at the route + backend layers.

## Decision summary (the standard)
### A) Two distinct shells (non-negotiable)
1) **Client shell**: client-facing portal; minimal, task-focused, no admin concepts.
2) **Ops shell**: staff/admin portal; hub-and-spoke model; role/tenant/capability gated.

Shells must remain visually and structurally distinct (different IA, different chrome).

### B) Maximum 3 navigation levels (non-negotiable)
1) **Level 1: Global hubs** (persistent nav)
2) **Level 2: Section navigation inside a hub** (choose ONE pattern per hub)
3) **Level 3: In-page navigation** (anchors/stepper/segmented control)

Hard rule: **No stacked routing controls** (e.g., global tabs + nested tabs + feature tabs).

### C) When to use tabs vs left section nav
- **Tabs** are allowed only for **≤5 sibling routes** and must never overflow horizontally.
- For breadth (admin/settings, large modules): use **left section nav** (grouped + searchable).
- In-page segmented controls are allowed, but they should not be the primary way to “find” major features.

### D) Gating model (multi-tenant, multiple roles, many modules)
Navigation and access are determined by:
`effectiveAccess = RBAC(role permissions) ∩ actingOrg scope ∩ orgCapabilities(enabled modules) ∩ featureFlags`

For features not enabled for an org:
- IHARC admin: show item with an “enable” affordance (where appropriate).
- Org admin: optionally show disabled + “contact IHARC to enable”.
- Non-admin: hide.

### E) IHARC as an organization (tenant model)
IHARC exists as a normal organization in the org table; IHARC staff/admins are members of IHARC org.

Important: **IHARC org is not a security backdoor**. Cross-tenant powers are granted via **platform roles** (e.g., `iharc_admin`), not by being in IHARC org.

## Canon workflow alignment (ground truth)
From the canonical scenarios (`docs/Scenarios/Scenarios-1.md`):
- Clients are the spine; Client Journey is canonical.
- Encounters are the universal interaction record.
- Supplies distribution and Referrals are recorded from inside Encounters (not via detours into other hubs).
- Consent/sharing is always a first-class UI signal.
- Role-scoped landing reduces cognitive load while preserving one app shell.

## App structure

### 1) Client shell (client portal)
Goal: minimal destinations; clear next actions; no tenant-switching or admin concepts.

**Primary nav (keep small and stable)**
- Home
- Appointments
- Documents
- Consents
- Support
- Profile

Rules:
- No module surfacing (inventory, org admin, directory) in the client shell.
- Cross-org collaboration is reflected through consent and “shared with” signals, not navigational complexity.

### 2) Ops shell (staff/admin portal)
Goal: hub-and-spoke; scales with breadth; global nav remains thin.

#### Level 1: Global hubs (thin sidebar; cap at 7–9, target 7)
1) Today
2) Clients
3) Programs
4) Inventory
5) Directory (rename from “Partners” if it is primarily a directory)
6) Organization (org admin only; tenant-scoped)
7) STEVI Admin (IHARC super-admin only; platform scope)

Global rules:
- Sidebar shows hubs only (no deep-link sprawl).
- Acting-org context is always visible; switcher appears only when the user can act as multiple orgs.
- Default acting org for IHARC staff/admins is IHARC org.

#### Level 2: Secondary nav (one pattern per hub)
Preferred standard for breadth: **left section nav**, grouped and optionally searchable.
Tabs allowed only for small sibling sets (≤5) and must not stack with other route-nav.

Recommended Level 2 structures:
- Today: My day / Intake queue / Outreach / Tasks / Recents (role gated)
- Clients: Search / Caseload / Consents overview (role gated)
- Programs: Programs / Schedules / Appointments (role gated)
- Inventory: Stock / Locations / Transactions / Reconciliation (role gated)
- Directory: Orgs directory / Services directory / Referral destinations (read-only baseline; config lives elsewhere)
- Organization (org admins): Overview / Members / Invites / Appointments / Settings / Modules (view-only)
- STEVI Admin: Overview / Organizations (capabilities) / Users & Roles / Content & Notifications / Inventory & Donations / Website & Marketing / Ops configuration

#### Level 3: In-page navigation
Use anchors/stepper/segmented controls for multi-panel configuration. Do not create additional route-tabs “just to fit”.

## UI rules that prevent the screenshot failure mode
The screenshot problem is “competing nav layers”: global nav + admin tabs + nested tabs + feature tabs + custom back button.

Hard rules:
1) A page may have **at most one routing control** visible (tabs OR left section nav), not both.
2) Admin/settings screens must not use stacked tab rows. Use a single **Settings shell**: left section nav + breadcrumbs + content.
3) No “Back to …” button for navigation between sibling admin sections; use breadcrumbs/section nav. (Page headers can still have primary actions, but not as a substitute for navigation.)
4) Horizontal overflow nav is forbidden on desktop; convert to left nav or in-page sections.
5) Layout-reserved columns (e.g., Ops Inbox) must be gated by the **same route signal as the panel**. Use `usePathname()` (client) plus a shared helper so the grid never reserves an “invisible” column due to server header path inference mismatches.

## Implementation plan (phases)
Progress markers use checkboxes to survive handoffs.

### Phase 0 — Codify the standard
1. [ ] Write the shared nav primitives and rules doc (this file) into team practice.
2. [ ] Add PR checklist items: 3-level max, no stacked route-nav, tabs ≤5, hub cap.

### Phase 1 — Navigation registry (single source of truth)
1. [ ] Define a typed nav registry that supports: label/icon, href, match, requires(RBAC), requiresCapability(org), flags.
2. [ ] Ensure the registry drives: global hubs, secondary nav, breadcrumbs, page titles.
3. [ ] Confirm route taxonomy separation: client vs ops, plus admin/settings under ops.

### Phase 2 — Admin/settings de-stacking (highest pain, fastest win)
1. [ ] Introduce an Ops “SettingsShell” layout: left section nav (grouped/searchable) + breadcrumbs.
2. [ ] Migrate `STEVI Admin` area to SettingsShell first.
3. [ ] Specifically remove stacked tabs in `Website & Marketing` and similar admin pages.

### Phase 3 — Hub-by-hub normalization
1. [ ] Ensure each hub uses exactly one Level 2 nav pattern.
2. [ ] Move “actions” into hubs/pages (e.g., start encounter from Today/Clients) rather than adding hubs.
3. [ ] Add progressive disclosure (“More tools”) inside hubs if a hub grows beyond ~8–10 items.

### Phase 4 — Gating + org capabilities
1. [ ] Treat IHARC as a normal org; ensure IHARC users are members of IHARC org.
2. [ ] Implement capabilities-based visibility (enabled modules per org).
3. [ ] Ensure cross-org client visibility is default when consent allows; provide “My org only” as optional filter.

### Phase 5 — QA, accessibility, and governance
1. [ ] Keyboard navigation, focus order, and ARIA for nav components.
2. [ ] Viewport QA (mobile drawer + tablet + desktop); ensure no “missing nav” breakpoints.
3. [ ] Instrument nav usage (optional) and review quarterly.

## Acceptance criteria
- No page shows more than one routing UI control (tabs OR section nav).
- Tabs never exceed 5 siblings and never overflow horizontally.
- Admin areas use SettingsShell (left section nav + breadcrumbs); no stacked tabs.
- Global ops sidebar remains hub-only; no deep-link sprawl.
- Acting org is clear; org-switching is explicit; IHARC is a normal org.
- Cross-org client visibility defaults to “All accessible (by consent)”.
- All gating is enforced at UI + route + backend layers.
- Layout columns never reserve blank space due to server/client route detection mismatches (e.g., inbox column appears only when inbox panel renders).

## Current code pointers (where this standard is implemented)
- Navigation data (ops + client): `src/lib/portal-navigation.ts`
- Area gating and landing: `src/lib/portal-areas.ts`
- Ops layout: `src/app/(ops)/layout.tsx`
- Shared shells/nav components:
  - `src/components/workspace/shells/app-shell.tsx`
  - `src/components/workspace/layout/ops-hub-rail.tsx`
  - `src/components/shared/layout/app-navigation.tsx`
  - `src/components/shared/layout/top-nav.tsx`
