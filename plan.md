# STEVI Ops Navigation Overhaul Plan

Last updated: 2025-12-12
Owner: IHARC / STEVI team (Codex agent)

## Purpose
Track the high‑level plan, context, and progress for a comprehensive overhaul of the **operations (ops) shell** navigation.  
This document is intended to survive agent handoffs (fresh Codex sessions), so it includes decisions, rationale, and file pointers.

## Product context (why this matters)
- STEVI is a multi‑tenant SaaS portal for IHARC admins, IHARC staff/volunteers, org admins/reps, and clients.
- A key demographic is older volunteers and technically‑challenged users. Navigation must be **obvious, low‑cognitive‑load, and consistent**.
- The app is pre‑production. **No backward‑compat shims or fallbacks** should be introduced; refactors can be clean and direct.
- UI must strictly adhere to existing **shadcn/ui token system** (see `src/styles/theme.css`, `tailwind.config.ts`).

## Current navigation snapshot (ops shell only)
- Dual shells exist; **client shell is out of scope for this plan**.
- Ops navigation source of truth:
  - `src/lib/portal-navigation.ts` (`buildPortalNav`, section/group/item rules)
  - `src/lib/portal-areas.ts` (area access + landing)
- Ops layouts:
  - `src/app/(ops)/layout.tsx` (builds navSections via `buildPortalNav`)
  - `src/components/workspace/shells/app-shell.tsx` (renders thin ops hub rail + `TopNav`)
  - `src/components/workspace/layout/ops-hub-rail.tsx` (desktop ops hub rail)
  - `src/components/shared/layout/app-navigation.tsx` (mobile nav sheet; hubs‑only in ops)
  - `src/components/shared/layout/top-nav.tsx` (shared top bar)

### Recent fix already shipped (pre‑plan)
- **Issue:** Desktop widths 1024–1279px had no navigation (OpsRail only at `xl`, hamburger hidden at `lg`).
- **Fix:** `TopNav` now keeps hamburger visible through `xl` for ops areas and avoids double nav when sidebar is present.  
  - File: `src/components/shared/layout/top-nav.tsx`

## Goals & constraints
1. **Thin, non‑overwhelming global nav**: no massive rail with every sub‑page.
2. **Hub‑and‑spoke IA**: global sidebar shows only top‑level hubs; deeper pages live inside each hub.
3. **Progressive disclosure**: long‑tail tools collapsed by default.
4. **Role + context filtering**: users see only what they can act on, for the active acting org.
5. **Scales to many features** without increasing global hub count.
6. **Shadcn tokens only**: no custom colors/spacing outside the system.

## Option 1 decision: Ops IA, hub cap, and ordering (RECOMMENDATION)
**Recommendation:** Adopt a **7‑hub cap** and keep hubs aligned to real frontline/admin workflows.

### Global ops hubs (visible in thin sidebar)
Order is by typical “day‑of‑work” flow and frequency for frontline users; admin hubs appear only when permitted.

1. **Today** (`/ops/today`)  
   - Primary working dashboard, visit start/resume, task focus.
2. **Clients / People** (`/ops/clients`)  
   - Directory, caseload, consents, person detail flows.
3. **Programs** (`/ops/programs`)  
   - Program schedules, appointments, program detail.
4. **Supplies** (`/ops/supplies`)  
   - Inventory distribution and ops inventory tasks.
5. **Partners** (`/ops/partners`) *(admins only)*  
   - Partner/org directory and relationships.
6. **Org Hub** (`/ops/org`) *(org admins/reps)*  
   - Acting‑org scoped admin: members, invites, org settings, appointments.  
   - IHARC admins access this hub from **STEVI Admin → Organizations** rather than as a top‑level hub.
7. **STEVI Admin** (`/ops/hq`) *(IHARC admins only)*  
   - STEVI‑wide controls, marketing/content, organizations, inventory settings.

### What moves out of global nav
- **Visits** should not be a separate hub. It’s a primary *action* surfaced in:
  - Today hub landing CTAs and/or Clients hub context.
  - This keeps the hub list within cap and matches modern SaaS IA (actions within hubs, not top‑level islands).

### Rationale
- Matches hub‑and‑spoke patterns in Stripe/Shopify/Linear: small global nav, depth inside hubs.
- Older/low‑tech users get a short list of destinations with clear labels and predictable placement.
- The cap enforces scalability; new features must join an existing hub, not inflate the sidebar.

## Implementation plan (ops only)
Progress markers use checkboxes so a new agent can continue cleanly.

1. [x] **Define final hub map and labels**
- Confirm labels (Today, Clients, Programs, Supplies, Partners, Org Hub, STEVI Admin).
   - Confirm workflow ordering above.
   - Update `NAV_SECTIONS` grouping if needed.

2. [x] **Replace ops desktop nav with a thin hub rail**
   - Delete legacy OpsRail and its usage (no fallback).
   - Build a small, hub‑only rail from `navSections` (1 link per hub) + small Recents block.
   - Styling on tokens (muted bg, primary active, focus rings).

3. [x] **Standardize in‑hub secondary nav**
   - Each hub landing page gets a clear secondary nav (tabs/local list).
   - Pattern should be shared, token‑based, and consistent.
   - Sub‑pages removed from global rail.

4. [x] **Add progressive disclosure for long‑tail tools**
   - Achieved by moving long‑tail tools into hub pages + secondary nav; explicit collapsible “More tools” to add once any hub exceeds ~8‑10 items.

5. [x] **Pinned / Recents shortcuts**
   - Implemented “Recents” (localStorage) at top of ops hub rail; pinned can follow once we decide persistence model.

6. [x] **Acting organization switcher**
   - Replace static badge when multiple orgs exist.
   - Server action updates acting org + refreshes permissions.
   - No client‑side role/org fetching.

7. [x] **Guardrails, tests, docs, QA**
   - Added hub‑cap unit test; update/add Playwright viewport assertions once authed e2e fixtures exist.
   - Docs updated: nav model, cap, breakpoints, hub ownership.

## Open questions / decisions needed
- Where should the thin hub rail appear at desktop (`lg` vs `xl`)?  
  Goal: always present where screen width supports it, without clutter.
- Preferred secondary nav pattern per hub: tabs vs local list?  
  (Tabs are already used in Org Hub; could standardize.)
- Do we want pinned items persisted per user now, or stubbed until data model exists?

## References
- Navigation data:
  - `src/lib/portal-navigation.ts`
  - `src/lib/nav-types.ts`
- Shell layouts:
  - `src/app/(ops)/layout.tsx`
  - `src/components/workspace/shells/app-shell.tsx`
- Current rails / menus:
  - `src/components/workspace/layout/ops-hub-rail.tsx`
  - `src/components/shared/layout/app-navigation.tsx`
  - `src/components/shared/layout/top-nav.tsx`
  - `src/lib/ops-hubs.ts` (hub extraction + cap)
