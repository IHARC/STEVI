# STEVI App Map (Working)

Last updated: 2026-01-02  
Status: Working document (expect frequent edits)

## Purpose

This document is a practical “map” of STEVI’s information architecture:
- high-level site map (routes and hubs)
- feature inventory (what exists vs what’s planned)
- shell/layout model (Client vs Ops, and the Ops sub-areas)
- tenancy model (IHARC platform admins + org tenants + per-org capabilities)

It is meant to be read alongside:
- `docs/README.md` (docs index + canonical sources)
- `docs/ui-standards.md` (app‑wide UI standards + navigation conventions)
- `docs/navigation-ownership.md`
- `src/lib/portal-navigation.ts` (Ops hubs and gating)
- `src/lib/client-navigation.ts` (Client portal nav)
- `src/lib/portal-access.ts` (capability derivation)
- `src/lib/portal-areas.ts` (area gating and landings)

### Keeping this doc accurate (source of truth)

Routes are defined by Next.js App Router under `src/app`. When updating this doc, sanity-check route coverage with:

```bash
find src/app -name 'page.tsx' -o -name 'route.ts' -o -name 'layout.tsx' | sed 's#^src/app/##' | sort
```

## Shells & areas

### Global entry points (no shell)
- Global layout wrapper: `src/app/layout.tsx`
- `/` → redirects to `/auth/start` or an area landing (`src/app/page.tsx`)
- `/auth/start` (OAuth entrypoint, supports `?next=...`)
- `/auth/callback` (OAuth code exchange)
- `/auth/error` (OAuth error landing)
- `/oauth/consent` (login.iharc.ca authorization + consent UI)

### Client shell (client portal)
Route group: `src/app/(client)`  
Primary nav registry: `src/lib/client-navigation.ts`
Layout + theme:
- `src/app/(client)/layout.tsx`
- `src/styles/theme.client.css`
Shell component: `@client/client-shell`

Behavior to be aware of:
- **Onboarding gate**: for client-only users (not ops/frontline/org/admin) the client layout redirects to `/onboarding?next=...` until onboarding is `COMPLETED`.
- **Preview mode**: add `?preview=1` on client URLs to render in preview; client layout preserves preview when navigating, and mutation-capable UI should be wrapped with `ClientPreviewGuard`.

Core routes:
- `/home`
- `/onboarding` (client + assisted onboarding wizard)
- `/appointments` (timeline + request/reschedule/cancel)
- `/appointments/upcoming` (placeholder)
- `/appointments/past` (placeholder)
- `/cases` and `/cases/[caseId]`
- `/support`
- `/messages` (currently placeholder)
- `/documents`
- `/resources`
- `/profile`
- `/profile/consents`

### Ops shell (staff / tenant portal)
Route group: `src/app/(ops)`  
Primary nav registry: `src/lib/portal-navigation.ts`
Layout + theme:
- `src/app/(ops)/layout.tsx`
- `src/styles/theme.ops.css`
Shell component: `@workspace/shells/app-shell`

Behavior to be aware of:
- **No client preview**: ops routes reject client preview mode; ops users should exit preview back to their landing path.

Ops has one *area* (guards + landing behavior are centralized):
- `ops_frontline` (Today/Clients/Programs/Inventory/Fundraising/Organizations)

Area inference + guards:
- `src/lib/portal-areas.ts`

Ops utility routes (not hubs, but live and linked from hub actions):
- `/ops/profile` (operations account settings; affiliation + org selection)
- `/ops/encounters/new` (Encounter-first entry point; org gating + context capture)

### App Admin shell (IHARC super admin portal)
Route group: `src/app/(app-admin)`  
Base path: `/app-admin`  
Layout + theme:
- `src/app/(app-admin)/app-admin/layout.tsx`
- `src/styles/theme.ops.css`
Shell component: `@workspace/shells/app-shell`

App admin *area* (guards + landing behavior are centralized):
- `app_admin` (STEVI Admin)

## Tenancy & permissions (current model)

### Role sources
Role/permission context is loaded via Supabase RPCs (`core.get_actor_global_roles`, `core.get_actor_org_roles`, `core.get_actor_org_permissions`, `core.get_actor_permissions_summary`) in `src/lib/portal-access.ts` and treated as the source of truth (no JWT fallbacks).

### Current role families
- Global roles (IHARC): `iharc_admin` (global admin)
- Org roles (tenant/org): `org_admin`, `org_rep`, `org_member`, `org_marketing` plus IHARC org roles (`iharc_staff`, `iharc_supervisor`, `iharc_volunteer`)

### Capability flags (derived)
`src/lib/portal-access.ts` derives capability booleans consumed by nav, routes, and actions:
- `canAccessOpsFrontline`
- `canAccessOpsOrg`
- `canAccessOpsAdmin`
- `canAccessOpsSteviAdmin`
- `canManageOrgUsers`, `canManageOrgInvites`
- `canAccessInventoryOps`
- plus admin/content/policy/etc flags (see file)

Org-scoped users:
- “Org member”/`org_member` (agency partner) can access `/ops/organizations` and view **their own** org detail **Overview**.
- “Org rep” (`org_rep`) can manage invites/appointments for **their own** org.
- “Org admin” (`portal_org_admin`) can manage members + settings for **their own** org.
- IHARC admins (`iharc_admin`) can access and administer **all** orgs.

### Acting organization
Acting org context comes from:
- `portal.profiles.organization_id` (current org)
- `actingOrgChoices` and selection behavior in `src/lib/portal-access.ts`

## Per-organization capabilities (modules)

Capabilities (enabled modules) are stored on the org record:
- table: `core.organizations`
- field: `services_tags` (`json`)
- keys: `src/lib/organizations.ts` (`ORG_FEATURE_OPTIONS`)

Current known capability keys:
- `appointments`
- `calls_for_service`
- `documents`
- `notifications`
- `inventory`
- `donations`
- `metrics`
- `time_tracking`
- `org_workspace`

Rule of thumb:
- IHARC admins can set/modify org capabilities.
- Tenant UX should only surface enabled modules for that org (hide or disable otherwise).

## Site map (high-level)

### Client portal (client shell)
Nav groups per `src/lib/client-navigation.ts`:
- Overview: `/home`, `/appointments`
- Care & support: `/cases`, `/support`, `/messages`
- Records: `/documents`, `/resources`
- Profile & consents: `/profile`, `/profile/consents`

Additional client routes (not in nav, but part of the client shell):
- `/onboarding` (may be linked to from login/landing; supports `?next=...` and `?person=...` for assisted flows)
- `/appointments/upcoming`, `/appointments/past` (currently placeholder pages)
- `/cases/[caseId]` (case detail)

### Ops portal (ops shell)
Hubs per `src/lib/portal-navigation.ts`:

#### Operations (ops_frontline)
- Today: `/ops/today`
- Clients: `/ops/clients` (supports `?view=directory|caseload|activity`) and `/ops/clients/[id]`
- Programs: `/ops/programs` (supports `?view=schedule`) and `/ops/programs/[id]`
- Inventory: `/ops/inventory` (supports `?view=dashboard|items|locations|receipts`), plus:
  - `/ops/inventory/items/new`
  - `/ops/inventory/items/[itemId]`
- Fundraising: `/ops/fundraising` (tabs managed within the page)
- Fundraising detail: `/ops/fundraising/items/[itemId]`
- Organizations directory: `/ops/organizations`
- Organization detail (role-gated tabs): `/ops/organizations/[id]` with `?tab=settings|members|invites|appointments`

### App Admin portal (app_admin)
Admin “settings shell” root: `/app-admin`

Live admin routes (as of 2025-12-16):
- Overview: `/app-admin`
- Content & notifications: `/app-admin/content`
- Integrations: `/app-admin/integrations`
- Users: `/app-admin/users`, `/app-admin/users/[segment]`, `/app-admin/users/profile/[profileId]`
- Operations: `/app-admin/operations`
- Website & marketing (page-level routes):
  - `/app-admin/website` (index)
  - `/app-admin/website/branding`
  - `/app-admin/website/home`
  - `/app-admin/website/navigation`
  - `/app-admin/website/programs`
  - `/app-admin/website/supports`
  - `/app-admin/website/inventory`
  - `/app-admin/website/footer`

Admin modules present in the repo but not currently exposed as routes:
- Several subfolders under `src/app/(app-admin)/app-admin/*` contain actions/components (e.g., `policies`, `resources`, `notifications`, `organizations`, `consents`) but do not have `page.tsx` routes yet. Treat them as “in progress” until wired into navigation and given real URLs.

### API routes (server-only)
- `/api/appointments/search-profiles` (used by appointment profile search UI)
- `/api/donations/stripe-webhook` (Stripe webhook endpoint)
- `/api/telemetry` (client/server telemetry collection)

### Deprecated / pending removal
- Legacy `/ops/directory` route was removed in favor of `/ops/organizations` (folder may still exist but should not be used).
- Legacy `/app-admin/organizations/*` pages were removed in favor of `/ops/organizations` + consolidated org detail tabs (folder may still exist but should not be used).
- Legacy `/ops/org/*` org hub routes were removed; use `/ops/organizations/[id]` tabs instead.
- Legacy `/ops/visits/*` folder is not a live route; use `/ops/encounters/*`.

## Feature inventory (working checklist)

### Client portal
- [x] Onboarding wizard (`/onboarding`)
- [x] Appointments request surface
- [ ] Upcoming/past appointment subpages (`/appointments/upcoming`, `/appointments/past`) wired to real data
- [x] Documents locker (client)
- [x] Resources (client)
- [x] Consents (client)
- [x] Support requests
- [ ] Messages (wired to real data)

### Ops frontline
- [x] Today hub (intake queue + quick actions)
- [x] Clients hub (directory/caseload/activity views)
- [x] Programs hub (basic schedule/overview)
- [x] Inventory hub (dashboard/items/locations/receipts)
- [x] Fundraising hub (admin-facing donation tooling)
- [x] Organizations directory (list + IHARC-admin creation modal)
- [x] Encounter-first flow (start + workspace) (`/ops/encounters/new`, `/ops/encounters/[id]`)

### Org tenant hub
- [x] Org-scoped access to Organizations list/detail
- [x] Members (org admin) via org detail tab
- [x] Invites (org admin/rep) via org detail tab
- [x] Settings (org admin) via org detail tab
- [x] Appointments (org admin/rep) via org detail tab
- [ ] Org workspace for standard org users (`portal_user`) with read-only operational context (inventory/donations/programs/etc)
- [x] Consolidated org admin tooling into `/ops/organizations/[id]` (single tabbed interface; removed `/ops/org/*`)

### STEVI Admin
- [x] Users & access management
- [x] Content & notifications monitoring
- [x] Integrations and website content
- [ ] Replace remaining stubs (service rules, warming room, templates) with real models + audit coverage or remove

## Open questions (capture here; resolve in PRs)
- What is the long-term tenant role model beyond `portal_org_admin` / `portal_org_rep` / `portal_user` (e.g., org volunteer/staff/supervisor roles)?
- Which org-scoped “info” modules must be available to all org users now (inventory activity, donations, programs, metrics)?
- Should “org rep” remain distinct from “org user”, or collapse to a simpler model where only org admins manage membership and everyone else is read-only?
