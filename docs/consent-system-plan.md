# STEVI Consent System Plan (Org-Level Data Sharing)
Last updated: 2025-12-25

## Purpose
Provide a complete, implementation-ready plan for a per-organization consent system in STEVI that supports:
- Client self-service consent changes in the portal.
- Staff-assisted consent capture for clients without internet access.
- Two-tier permissions (org staff/admins vs IHARC global admins).
- Full auditability and defensible consent provenance.

This document is written so a new Codex instance can implement the system end-to-end without re-researching.

## Scope
- Data sharing consent across participating organizations (IHARC + partner orgs).
- Clients can opt out of specific orgs while consenting to others.
- Org staff can record client consent in person (client present) including cross-org selections.
- Consent changes are auditable, enforceable in RLS, and reflected in UI for clients and staff.

## Non-goals
- E-signature platform integration (DocuSign, etc.).
- Paper form workflows (no scanned paper or document upload in v1).
- Retroactive recall of already disclosed data.

## Key decisions (requirements)
1) Two-tier permissions:
   - Org users and org admins have the same consent access (org tier).
   - IHARC global admins have elevated override abilities (global tier).
2) Clients can modify cross-org consents directly in the client portal.
3) Staff-assisted consent capture must work without client internet access.
4) Staff-assisted flow requires two attestations: staff and client.
5) Consent actions must be fully auditable (who, when, how, why).

## Guiding principles (healthcare best practice)
- Least privilege, purpose limitation, and minimum necessary access.
- Consent is recorded with provenance (method, actor, org, attestations).
- No wrong doors: any org can help a client complete consent when the client is present.
- Name-only discovery before consent; no PHI access without consent.

## Roles and tiers
- Client (data subject):
  - Can view and modify consent scope and org selections at any time in portal.
  - Can renew or revoke consent.
- Org tier (org users/admins):
  - Can search by name-only and submit consent requests.
  - Can record consent for a client when client is present, including cross-org selections.
  - Cannot override consent without client presence.
  - Cannot access global admin area.
- IHARC global admins:
  - Can override consent, revoke, renew, and manage cross-org decisions as custodian.
  - Can access global admin area.

## Current state (as of 2025-12-24)
- Core tables exist: `core.person_consents`, `core.person_consent_orgs`, `core.person_consent_requests`.
- Client portal consents UI exists at `/profile/consents`.
- Admin consent UI exists at `/app-admin/consents`.
- Consent requests + name-only search exist in Ops at `/ops/consents`.
- RLS enforces consent for `core.people` and activities.

## Gaps vs requirements
- Org admins with `portal.manage_consents` cannot use `/app-admin` because that area is global-admin only.
- Staff-assisted consent capture with dual attestation is not implemented.
- Consent updates currently update `core.people` contact fields in admin action, which will fail for org tier without grants.

## Target behavior (end state)
1) Client portal: client can modify cross-org consent scope and org list.
2) Staff-assisted: org staff can record consent when client is present, including cross-org selections, with dual attestation.
3) Org users can request consent without prior access.
4) IHARC admins can override and manage global consent decisions.
5) Every consent change is auditable with clear provenance.
6) Consent expires automatically and must be renewed.

## Workflows

### A) Client self-service consent (portal)
- Route: `/profile/consents`
- Client selects scope: all orgs / selected orgs / IHARC only.
- Client toggles participating orgs.
- Client confirms consent (attestation checkbox).
- System writes `core.person_consents` and `core.person_consent_orgs`.
- Consent grants are synced immediately.

### B) Staff-assisted consent capture (client present)
- Route: new Ops screen, e.g. `/ops/consents/record`.
- Staff finds client via name-only search (people_name_only).
- Staff selects consent scope and org list (cross-org selections allowed).
- Required attestations:
  - Staff: "Client is present and consent explained in plain language."
  - Client: "I understand and agree to this sharing selection."
- Consent method: staff_assisted / verbal / documented.
- System writes consent with `captured_org_id = acting org` and both attestation flags true.
- Audit log includes attestation flags and method.

### C) Consent request (no client present)
- Org submits request via Ops (`core.person_consent_requests`).
- Client can approve later in portal or staff can complete during in-person visit.
- Approval creates consent record and syncs grants.

### D) Renewal and revocation
- Consent expires after configurable days (default 90).
- Client or IHARC admin can renew.
- Client can revoke in portal; IHARC can revoke in admin.

## Data model changes

### Existing tables (keep)
- `core.person_consents`
- `core.person_consent_orgs`
- `core.person_consent_requests`
- `core.people_name_only`
- `core.participating_organizations`

### Add columns to core.person_consents
Purpose: store capture context and attestation for staff-assisted consent.

Suggested columns:
- `captured_org_id bigint null references core.organizations(id) on delete set null`
- `attested_by_staff boolean not null default false`
- `attested_by_client boolean not null default false`
- `attested_at timestamptz null`

Notes:
- `captured_method` already exists and will be used (portal, staff_assisted, verbal, documented, migration).
- `captured_org_id` is required for staff-assisted/verbal/documented in Ops.
- `attested_at` set when both attestations are true.

### Optional (future) evidence table
We are not implementing signature or paper scanning in v1. A future evidence table can be added if needed.

## RLS and policy changes

### Consent tables
Existing policies already allow:
- IHARC/global admin.
- Org users with `portal.manage_consents`.
- Client self (via `core.user_people`).

We keep these but add server-side guards to enforce:
- Org tier must set `captured_org_id` to their acting org.
- Org tier must set both attestations to true.
- Org tier can write consent even without `person_access_grants`.

### People table updates
Current `adminOverrideConsentAction` updates `core.people` and is blocked for org tier.
Fix:
- Split contact info updates (IHARC/admin only) from consent updates (org tier allowed).
- Client portal still updates contact fields for their own record.

## Server actions and library changes

### Consent library (src/lib/consents)
Update `saveConsent` signature to accept:
- `capturedOrgId?: number | null`
- `attestedByStaff?: boolean`
- `attestedByClient?: boolean`
- `attestedAt?: string | null`

Enforce in code:
- If method is staff_assisted/verbal/documented, require `capturedOrgId` and both attestations true.
- If method is portal, set `attestedByClient = true`, `attestedByStaff = false`.

### Client portal action
`updateConsentsAction`:
- Keep as client self-service.
- Set `captured_method = portal` and `attestedByClient = true`.

### Ops staff-assisted action (new)
Create `recordStaffConsentAction`:
- Requires `access.canManageConsents` and `access.organizationId`.
- Requires both attestations.
- Allows cross-org selections.
- Calls `saveConsent` with `capturedOrgId` and attestation flags.
- Does NOT update `core.people` contact fields.

### Admin overrides
- Keep `/app-admin/consents` for IHARC global admins only.
- `adminOverrideConsentAction` should be limited to IHARC/global tier.

## UI changes

### Client portal
- `src/app/(client)/profile/consents/page.tsx` remains primary client self-service.
- Confirm checkbox label should make attestation explicit.

### Ops
- Extend `/ops/consents` or add `/ops/consents/record`.
- Use name-only search from `core.people_name_only`.
- Provide staff-assisted consent form with:
  - scope selector
  - org list
  - method selector
  - staff attestation checkbox
  - client attestation checkbox
  - notes

### App admin
- `/app-admin/consents` remains for IHARC/global admins.
- Add UI text clarifying this is IHARC-only override.

## Audit logging requirements
Every consent action must call `logAuditEvent` with:
- action: consent_created, consent_updated, consent_revoked, consent_org_updated, consent_renewed
- entityType: core.person_consents
- entityRef: person + consent id
- meta includes:
  - person_id
  - scope
  - allowed_org_ids / blocked_org_ids
  - captured_method
  - captured_org_id
  - attested_by_staff
  - attested_by_client
  - actor_role (client / org / iharc)
  - request_id if resolved from a consent request

Ops search already logs `consent_search` and should remain.

## Access grants
- Continue syncing grants on consent changes via `syncConsentGrants`.
- Expiry should align with consent expiry.

## Edge cases
- Consent expired: behaves like no consent until renewed.
- Consent revoked: blocked for all orgs.
- Org tier can update cross-org selections only when client present and attestations recorded.
- Client portal can update any time.

## Implementation plan (phased)

### Phase 1 - Schema updates
1) Add new columns to `core.person_consents`.
2) Update TypeScript types (`src/types/supabase.ts`).
3) Add any required indexes if needed.

### Phase 2 - Consent service updates
1) Update `saveConsent` to accept and persist attestation + captured org.
2) Add validation logic for staff-assisted methods.
3) Ensure `getEffectiveConsent` includes new fields for audit context if needed.

### Phase 3 - Ops staff-assisted flow
1) Add new Ops route for staff-assisted consent capture.
2) Build form UI with dual attestation checkboxes.
3) Implement `recordStaffConsentAction`.
4) Ensure only org tier can access it.

### Phase 4 - App admin refinement
1) Restrict app-admin consent overrides to IHARC/global tier.
2) Remove contact field updates from org-tier flows.

### Phase 5 - Testing
- Unit tests for consent validation and attestation logic.
- Integration tests for RLS access (org tier insert/update consent without person grants).
- E2E tests for staff-assisted flow and client portal flow.

## File map (expected touch points)
- Consent plan: `docs/consent-system-plan.md`
- Consent library: `src/lib/consents/*`
- Client portal consents: `src/app/(client)/profile/consents/page.tsx`
- Client consents action: `src/lib/cases/actions.ts`
- Ops consent requests: `src/app/(ops)/ops/consents/*`
- App admin consents: `src/app/(app-admin)/app-admin/consents/*`
- Supabase migrations: `supabase/migrations/*`

## Justifications for key decisions
- Two-tier access aligns with healthcare governance: org staff can record consent with client present, but global custodians retain override authority.
- Dual attestation provides defensible evidence without requiring e-signatures or paper scanning.
- Staff-assisted flow supports homeless-first populations where portal access is limited.
- Name-only discovery and explicit consent requests reduce PHI exposure and align with minimum necessary access.
