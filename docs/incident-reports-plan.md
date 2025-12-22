# Incident Reports (Multi-tenant module) — Implementation Plan

Date: 2025-12-12

This document is a handoff plan for implementing “Incident Reports” inside **STEVI** (not the legacy S.T.E.V.I.-OPS app).
It assumes most back-end primitives already exist in Supabase from the old ops implementation, but **they are currently not safe
to roll out to partner organizations without hardening**.

## Goals

- Allow frontline outreach workers (IHARC + partner org users) to create and manage incident reports for tracking.
- Incidents are **org-scoped** in v1 (no cross-org sharing).
- Support a **module toggle** per organization.
- Use the **existing role/permission system** (`core.permissions`, `core.role_templates`, `core.role_template_permissions`,
  `core.org_roles`, `core.org_role_permissions`, `core.user_org_roles`, `core.global_roles`, `core.user_global_roles`) and the
  admin flows already present in STEVI (user management + permission granting).
- Enforce “no free-text individuals”: people involved must be either a linked `core.people` record **or** an explicit “Unknown party”
  entry with a description; never a single free-text person field on the incident itself.

## Non-goals (v1)

- Cross-org sharing of incidents.
- Public/anon incident entry.
- Replacing the entire legacy incident schema. We build on what exists, and we tighten it.

## Current State (Supabase findings)

### Tables/enums you will build on

- `case_mgmt.incidents`
- `case_mgmt.incident_people`
  - Has `person_id` (link to `core.people`) plus unknown-party fields: `is_unknown_party`, `unknown_party_description`.
- `case_mgmt.incident_person_medical`
- `case_mgmt.incident_links`
- Enums in `core`: `incident_type_enum`, `incident_status_enum`, `incident_priority_enum`, `incident_complexity_enum`, `incident_outcome_enum`

### Module toggle already exists in STEVI (frontend-side)

- Org feature flags are stored in `core.organizations.services_tags` (JSONB) and edited in STEVI’s ops admin org pages.
- Frontend helpers live in `STEVI/src/lib/organizations.ts` (`extractOrgFeatureFlags`, `mergeFeatureFlagsIntoTags`).

### Critical security blockers (must fix before shipping anything)

These were observed in the live Supabase project and must be corrected as step 0:

1. **`public.get_incidents_list` → `public.get_enhanced_list` is `SECURITY DEFINER` and callable by `PUBLIC/anon`.**
   - `case_mgmt.incidents` is owned by `postgres` and **does not have `FORCE ROW LEVEL SECURITY` enabled**.
   - This combination can bypass intended RLS and is not safe for org rollout (and may be unsafe today).
2. **`case_mgmt.incident_people` and `case_mgmt.incident_person_medical` have permissive “`qual = true`” RLS policies** and broad grants.
   - This can make incident-party data effectively world-accessible to any authenticated user.
3. A legacy function `public.create_incident(p_agent_name text, p_payload jsonb)` exists and is granted to `PUBLIC`,
   but references `public.incidents` which does not exist (schema drift). Do not build on it.

Do not proceed to UI work until these are addressed.

## Architecture in STEVI (what you should reuse)

- Auth/session: `@supabase/ssr` cookies. Use server actions/route handlers + `createSupabaseServerClient`.
- Access model is computed server-side in `STEVI/src/lib/portal-access.ts` and used for nav gating.
- Admin “Users” management already exists and assigns roles via org/global role tables (no JWT refresh RPCs).
- Permission primitives:
  - `core.permissions`, `core.role_templates`, `core.role_template_permissions`, `core.org_roles`, `core.org_role_permissions`,
    `core.user_org_roles`, `core.global_roles`, `core.user_global_roles` exist with RLS suitable for admin management.
  - `public.has_permission_single(permission_name text)` exists and is already used in some RLS policies.

## High-level design (v1)

### Tenancy model (org-scoped incidents)

- Add `organization_id bigint` to `case_mgmt.incidents`.
- Set it on insert:
  - IHARC users can set any org (or leave null if you decide to backfill/require later).
  - Org users: must match `portal.actor_org_id()`.
- RLS for `case_mgmt.incidents`:
  - IHARC access unchanged (existing `is_iharc_user()`).
  - Org access requires:
    - `portal.actor_is_approved()`
    - org module enabled (feature flag)
    - a specific permission (e.g. `incidents.view`, `incidents.create`, …)
    - `case_mgmt.incidents.organization_id = portal.actor_org_id()`

### People-involved rule (“no free text individuals”)

- Do **not** use `case_mgmt.incidents.incident_people` (JSONB) or `reported_by` (text) to represent people.
- UI must create/update `case_mgmt.incident_people` rows only, with:
  - Known person: `person_id = <core.people.id>` and `is_unknown_party = false`
  - Unknown party: `is_unknown_party = true` AND `unknown_party_description` populated, `person_id = null`

### Permissions model

Create (at minimum) these permissions (names are suggestions; pick a stable naming scheme and keep them consistent):

- `incidents.view`
- `incidents.create`
- `incidents.update`
- `incidents.close` (optional if closing is just update)
- `incidents.delete` (likely IHARC-only)
- `incidents.people.manage`
- `incidents.links.manage`

Roles are how you get per-user granularity today:

- Create `portal_incidents_reporter` (create/view, limited update)
- Create `portal_incidents_manager` (update/close, manage people/links)
- Assign roles per user; if you need “per user custom permissions”, you can create a custom role and assign it to that one user.

## Implementation Plan (do in order)

### Phase 0 — Supabase hardening (blocker)

Deliverable: incidents tables and RPC surface are safe under RLS for both IHARC and org users.

1. **Stop the RLS bypass risk**
   - Prefer: `ALTER TABLE case_mgmt.incidents FORCE ROW LEVEL SECURITY;`
   - Also set `FORCE ROW LEVEL SECURITY` on `case_mgmt.incident_people`, `case_mgmt.incident_person_medical`, `case_mgmt.incident_links`.
2. **Restrict or remove dangerous `SECURITY DEFINER` list functions**
   - Options:
     - Remove `SECURITY DEFINER` from `public.get_enhanced_list` / `public.get_incidents_list` and make them `SECURITY INVOKER`.
     - Or keep them, but revoke `EXECUTE` from `PUBLIC/anon/authenticated`, and only allow trusted roles (ideally not needed by STEVI).
   - Do not rely on “UI hiding” here—treat these as public API surface.
3. **Fix RLS on `incident_people` + `incident_person_medical`**
   - Replace permissive `qual=true` policies with policies that join back to `case_mgmt.incidents` and apply the same access rules.
4. **Ignore/remove/lock down `public.create_incident`**
   - It references a non-existent table and is granted broadly. Either fix the missing table (if used elsewhere) or revoke `EXECUTE`
     from `PUBLIC` and document ownership (voice stack vs STEVI).

Implementation notes:
- Put changes into a new migration under `STEVI/supabase/migrations/`.
- Verify with Supabase MCP (`pg_policies`, `has_function_privilege`, `relforcerowsecurity`) after applying.

### Phase 1 — Tenancy + module flag enforcement in Supabase

Deliverable: `case_mgmt.incidents` is org-scoped and module-gated.

1. Add `organization_id` to `case_mgmt.incidents` and index it.
2. Backfill existing rows (decide strategy):
   - Option A: set to the IHARC org id for all legacy incidents.
   - Option B: allow null for legacy rows and restrict org access to non-null only.
3. Add a small helper function to check org module flags without granting orgs `SELECT` on `core.organizations`:
   - Example: `core.organization_has_feature(p_org_id bigint, p_feature text) returns boolean SECURITY DEFINER`
     which checks `core.organizations.services_tags` for the feature key.
4. Update `case_mgmt.incidents` RLS to allow org access when:
   - `portal.actor_is_approved()`
   - `has_permission_single('incidents.view')` (or create/update permissions per operation)
   - `organization_id = portal.actor_org_id()`
   - `core.organization_has_feature(organization_id, 'incidents')`

### Phase 2 — Permissions + role setup (admin-managed)

Deliverable: admins can grant incident permissions to roles and assign those roles to users.

1. Add the incident permissions in `core.permissions` (domain/category fields filled consistently).
2. Create role templates in `core.role_templates` (suggested):
   - `portal_incidents_reporter`
   - `portal_incidents_manager`
3. Grant permissions to those templates in `core.role_template_permissions`, then apply the template to org roles as needed.
4. Ensure org admins can assign these roles to users in their org (STEVI code change):
   - `STEVI/src/app/(ops)/ops/admin/users/actions.ts` should allow assigning org roles scoped to the same org.

Optional but recommended:
- Implement the missing permissions management page (only `actions.ts` exists today):
  - Route: `STEVI/src/app/(ops)/ops/admin/permissions/page.tsx`
  - UI: show roles + permissions list filtered by domain/category; enable toggling via `togglePermissionAction`.

### Phase 3 — STEVI feature flag + access wiring

Deliverable: incidents module is visible only when enabled for the org and permitted for the user.

1. Add org feature option:
   - Update `STEVI/src/lib/organizations.ts` to include `{ value: 'incidents', label: 'Incidents' }`.
2. Add permission awareness to `PortalAccess`:
   - Extend `STEVI/src/lib/portal-access.ts` to fetch current user’s permissions (via `core.get_actor_permissions_summary`)
     and expose a list like `access.permissions: string[]`.
   - Add derived booleans like `canViewIncidents`, `canCreateIncidents`, etc. using `access.permissions`.
3. Add derived feature flags:
   - Don’t assume org users can `SELECT core.organizations`.
   - Prefer reading org module state through a safe RPC/function (or reuse `core.organization_has_feature(portal.actor_org_id(), ...)`)
     exposed via `portal`/`public` for the current actor org only.
4. Gate navigation:
   - Add an “Incidents” entry in `STEVI/src/lib/portal-navigation.ts` with a `requires` predicate (feature enabled + permission).

### Phase 4 — Incidents UI + server actions

Deliverable: org users can create/list/view incidents; no person free-text fields; full RLS compliance.

Suggested routes (ops shell):
- List: `STEVI/src/app/(ops)/ops/incidents/page.tsx`
- Create: `STEVI/src/app/(ops)/ops/incidents/new/page.tsx`
- Detail: `STEVI/src/app/(ops)/ops/incidents/[id]/page.tsx`

Key UI requirements:
- Create incident:
  - Minimal required fields: `incident_type`, `incident_date` + `incident_time` (or a single datetime), `location`, `description` (optional if policy allows).
  - On submit: write `case_mgmt.incidents` with `organization_id = access.organizationId` (org users must have selected org).
- People section:
  - Add “Add known person” flow: search `core.people` under RLS; user can only select people they can view via grants.
  - Add “Add unknown party” flow: requires `unknown_party_description` and stores it in `case_mgmt.incident_people`.
  - Never allow a single textbox to represent a person.
- List/detail fetching:
  - Use direct PostgREST queries against `case_mgmt.incidents` and related tables (no `SECURITY DEFINER` list RPCs).
  - All queries must be made as the signed-in user (server client with cookies) to exercise RLS correctly.
- Audit:
  - Log every create/update/delete in `portal.audit_log` using existing helpers (`logAuditEvent`).
  - Keep DB triggers (like `audit_incidents_changes`) intact; don’t rely on them for STEVI audit needs.

### Phase 5 — Sharing later (v2 design only; do not implement now)

When ready to share incidents across orgs:
- Add `case_mgmt.incident_shares(incident_id bigint, organization_id bigint, access_level text, created_by uuid, created_at timestamptz)`
- Update incident RLS to permit access if:
  - `organization_id = portal.actor_org_id()` OR
  - `exists(select 1 from case_mgmt.incident_shares where incident_id = incidents.id and organization_id = portal.actor_org_id())`
- Keep permissions separate: sharing grants access; the actor still needs `incidents.view` to actually read.

## Testing + verification checklist

### Supabase (must verify with MCP)
- `case_mgmt.incidents` / `incident_people` / `incident_person_medical` / `incident_links`:
  - `relrowsecurity = true` and `relforcerowsecurity = true`
  - policies exist for IHARC + org cases, and **no permissive `true` policies** remain.
- RPCs:
  - `public.get_enhanced_list` / `public.get_incidents_list` are not executable by `anon` (or are removed / invoker-safe).
- Smoke test:
  - As org user without permission: cannot read/create incidents.
  - As org user with permission but feature off: cannot read/create incidents.
  - As org user with permission and feature on: can CRUD within their org only.

### STEVI (run locally)
- `npm run typecheck`
- `npm run lint`
- Add at least one Vitest test for access gating (e.g., nav requires permission + feature).

## Rollout steps

1. Apply Phase 0 hardening migration first (even if UI work is not ready).
2. Introduce `incidents` feature flag in org admin UI but leave it off for all orgs initially.
3. Create roles + permissions; assign to one pilot org user.
4. Enable `incidents` for a single pilot organization.
5. Validate RLS boundaries + audit logging before wider enablement.
