# STEVI App Map (Working)

Last updated: 2025-12-16  
Status: Working document (expect frequent edits)

## Purpose

This document is a practical “map” of STEVI’s information architecture:
- high-level site map (routes and hubs)
- feature inventory (what exists vs what’s planned)
- shell/layout model (Client vs Ops, and the Ops sub-areas)
- tenancy model (IHARC platform admins + org tenants + per-org capabilities)

It is meant to be read alongside:
- `plan.md` (navigation standard + IA decisions)
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
- `/` → redirects to `/login` or an area landing (`src/app/page.tsx`)
- `/login` (supports `?next=...`)
- `/reset-password` (request reset) and `/reset-password/update` (finish reset)
- `/auth/callback` (Supabase callback handler)
- Registration flows (see **Registration** below)

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

### Ops shell (staff / tenant / admin portal)
Route group: `src/app/(ops)`  
Primary nav registry: `src/lib/portal-navigation.ts`
Layout + theme:
- `src/app/(ops)/layout.tsx`
- `src/styles/theme.ops.css`
Shell component: `@workspace/shells/app-shell`

Behavior to be aware of:
- **No client preview**: ops routes reject client preview mode; ops users should exit preview back to their landing path.

Ops has three *areas* (guards + landing behavior are centralized):
- `ops_frontline` (Today/Clients/Programs/Inventory/Fundraising/Organizations directory)
- `ops_org` (org-tenant hub)
- `ops_admin` (STEVI Admin)

Area inference + guards:
- `src/lib/portal-areas.ts`

Ops utility routes (not hubs, but live and linked from hub actions):
- `/ops/profile` (operations account settings; affiliation + org selection)
- `/ops/visits/new` (Visit-first entry point; currently scaffolding + org gating)
- `/ops/hq/[[...path]]` → legacy redirect to `/ops/admin/*`

## Tenancy & permissions (current model)

### Role sources
All roles are loaded via Supabase RPC `get_user_roles` in `src/lib/portal-access.ts` and are treated as the source of truth (no JWT fallbacks).

### Current role families
- Platform roles (IHARC): `iharc_admin`, `iharc_supervisor`, `iharc_staff`, `iharc_volunteer` (`src/lib/ihar-auth.ts`)
- Portal roles (tenant/org): `portal_org_admin`, `portal_org_rep`, `portal_user`

### Capability flags (derived)
`src/lib/portal-access.ts` derives capability booleans consumed by nav, routes, and actions:
- `canAccessOpsFrontline`
- `canAccessOpsOrg`
- `canAccessOpsAdmin`
- `canAccessOpsSteviAdmin`
- `canManageOrgUsers`, `canManageOrgInvites`
- `canAccessInventoryOps`
- plus admin/content/policy/etc flags (see file)

Important constraint for upcoming org-tenant work:
- “Org user”/`portal_user` is a tenant member, but today the org hub is primarily gated by `canAccessOpsOrg` (org admin/rep). If we want standard org users to have a real tenant workspace, we must introduce an explicit “org workspace access” capability that does **not** implicitly grant frontline/admin capabilities.

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
- `documents`
- `notifications`
- `inventory`
- `donations`
- `metrics`
- `org_workspace`

Rule of thumb:
- IHARC admins can set/modify org capabilities.
- Tenant UX should only surface enabled modules for that org (hide or disable otherwise).

## Site map (high-level)

### Registration
Entry point: `/register`

Known flows (route group `src/app/register`):
- `/register/get-help`
- `/register/access-services`
- `/register/community-member`
- `/register/partner`
- `/register/volunteer`
- `/register/report-concern`

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
- Inventory: `/ops/inventory` (supports `?tab=dashboard|items|locations|receipts`), plus:
  - `/ops/inventory/items/new`
  - `/ops/inventory/items/[itemId]`
- Fundraising: `/ops/fundraising` (tabs managed within the page)
- Fundraising detail: `/ops/fundraising/items/[itemId]`
- Organizations directory: `/ops/organizations` and `/ops/organizations/[id]`

#### Org hub (ops_org)
Current routes (SettingsShell):
- `/ops/org` (overview)
- `/ops/org/members`
- `/ops/org/invites`
- `/ops/org/appointments`
- `/ops/org/settings`

#### STEVI Admin (ops_admin)
Admin “settings shell” root: `/ops/admin`

Live admin routes (as of 2025-12-16):
- Overview: `/ops/admin`
- Content & notifications: `/ops/admin/content`
- Integrations: `/ops/admin/integrations`
- Users: `/ops/admin/users`, `/ops/admin/users/[segment]`, `/ops/admin/users/profile/[profileId]`
- Operations: `/ops/admin/operations`
- Website & marketing (page-level routes):
  - `/ops/admin/website` (index)
  - `/ops/admin/website/branding`
  - `/ops/admin/website/home`
  - `/ops/admin/website/navigation`
  - `/ops/admin/website/programs`
  - `/ops/admin/website/supports`
  - `/ops/admin/website/inventory`
  - `/ops/admin/website/footer`

Admin modules present in the repo but not currently exposed as routes:
- Several subfolders under `src/app/(ops)/ops/admin/*` contain actions/components (e.g., `policies`, `resources`, `notifications`, `organizations`, `consents`) but do not have `page.tsx` routes yet. Treat them as “in progress” until wired into navigation and given real URLs.

### API routes (server-only)
- `/api/appointments/search-profiles` (used by appointment profile search UI)
- `/api/donations/stripe-webhook` (Stripe webhook endpoint)
- `/api/telemetry` (client/server telemetry collection)

### Deprecated / pending removal
- `/ops/hq/*` is a legacy path and now redirects to `/ops/admin/*` (`src/app/(ops)/ops/hq/[[...path]]/page.tsx`).
- Legacy `/ops/directory` route was removed in favor of `/ops/organizations` (folder may still exist but should not be used).
- Legacy `/ops/admin/organizations/*` pages were removed in favor of `/ops/organizations` + org hub tooling (folder may still exist but should not be used).

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
- [ ] Visit-first flow beyond scaffolding (currently `/ops/visits/new` + hub links)

### Org tenant hub
- [x] Members (org admin)
- [x] Invites (org admin)
- [x] Settings (org admin; scoped)
- [x] Appointments (org scope)
- [ ] Org workspace for standard org users (`portal_user`) with read-only operational context (inventory/donations/programs/etc)
- [ ] Consolidate org admin “detail” editing into the org hub (single tabbed interface; remove duplicate detail surfaces)

### STEVI Admin
- [x] Users & access management
- [x] Content & notifications monitoring
- [x] Integrations and website content
- [ ] Replace remaining stubs (service rules, warming room, templates) with real models + audit coverage or remove

## Open questions (capture here; resolve in PRs)
- What is the long-term tenant role model beyond `portal_org_admin` / `portal_org_rep` / `portal_user` (e.g., org volunteer/staff/supervisor roles)?
- Which org-scoped “info” modules must be available to all org users now (inventory activity, donations, programs, metrics)?
- Should “org rep” remain distinct from “org user”, or collapse to a simpler model where only org admins manage membership and everyone else is read-only?
