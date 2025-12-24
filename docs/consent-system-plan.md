# STEVI Consent System Plan (Org-Level Data Sharing)
Last updated: 2025-12-24

## Purpose
Provide a complete, implementation-ready plan for a per-organization consent system in STEVI. This document is written so a fresh Codex instance can implement without re-researching: it captures current state, HIFIS reference behavior, Ontario best-practice guidance, and a phased implementation plan with file touchpoints.

## Scope
- Client-facing consent to allow or restrict data sharing between participating organizations (IHARC + partner orgs).
- Ability for clients to opt out of specific organizations while still consenting to the continuum of care.
- Consent changes are auditable, enforceable in RLS, and reflected in UI for clients, staff, and admins.

## Non-goals (v1)
- Replacing existing onboarding/consent capture in full. We extend it to include org-level choices.
- Building a full document-signature system or e-signature capture.
- Retroactive "recall" of data already disclosed; we focus on forward-looking access controls and auditability.

## Current state (STEVI)
Sources: `docs/onboarding-consent-plan.md`, `docs/onboarding-contract.md`, code paths listed below.

### What exists
- Onboarding collects:
  - Service agreement + privacy acknowledgement -> `case_mgmt.client_intakes`.
  - Org-level consent choices -> `core.person_consents` (scope + org allow list).
  - Wizard lives at `/onboarding` and is enforced server-side by `assertOnboardingComplete`.
- Client profile consents page allows:
  - Global data sharing checkbox.
  - Preferred contact method and privacy notes.
- Admin actions:
  - Reset onboarding and resend onboarding link.
  - Consent override action exists but UI for consents is not wired.
- Access grants:
  - `core.person_access_grants` and helper actions exist.
  - Intake processing creates default org grants regardless of sharing preference.

### Where it lives (file map)
- Onboarding and consent capture:
  - `src/app/(client)/onboarding/page.tsx`
  - `src/app/(client)/onboarding/actions.ts`
  - `src/components/client/onboarding/sections/SharingCard.tsx`
  - `src/lib/onboarding/status.ts`
  - `src/lib/onboarding/guard.ts`
- Client consent editing:
  - `src/app/(client)/profile/consents/page.tsx`
  - `src/lib/cases/actions.ts` (updateConsentsAction)
- Access grants:
  - `src/lib/cases/grants.ts`
  - `src/lib/cases/intake.ts`
- Admin tooling stubs:
  - `src/components/workspace/admin/consents/consent-override-form.tsx`
  - `src/components/workspace/admin/clients/person-grant-form.tsx`
  - `src/app/(app-admin)/app-admin/consents/` (now implemented)
  - `src/app/(app-admin)/app-admin/clients/[personId]/` (empty)

### Gaps vs requirement (updated 2025-12-24)
- Core UI/UX flows implemented: onboarding capture, client profile edits, ops requests, admin consents.
- Consent scope + per-org allow list stored in `core.person_consents` + `core.person_consent_orgs`.
- Access grants are synchronized from consent changes (with expiry alignment in code).
- Remaining: audit logging for consent search activity, client-visible consent history, and automated test coverage.

### Audit findings (2025-12-24)
- UI/UX coverage: onboarding, client profile, ops requests, and admin management are wired.
- Audit events: consent create/update/renew/revoke and request approve/deny are logged; consent search activity is not.
- Grant expiry: consent sync now sets `person_access_grants.expires_at` to match consent expiry in code; existing grants need backfill if already created.
- Case access: `core.people` and `core.people_activities` enforce consent in RLS; `case_mgmt.case_management` access via direct user grants does not currently gate on consent (decision needed).

## HIFIS reference behavior (local docs)
Sources:
- `HIFIS_4.0.60.5/docs/HIFIS_SHARING_AND_CONSENT.md`
- `HIFIS_4.0.60.5/docs/HIFIS_WORKFLOWS.md`

Key concepts to mirror:
- Cluster boundary is primary tenant boundary (policy is cluster-level).
- Consent is its own record:
  - `HIFIS_Consent` with consent type and timestamps.
  - `HIFIS_Consent_ServiceProviders` lists orgs allowed by that consent.
  - Consent types can roll up to "Declined to Share".
- Record-level ownership flags (`OwnerOrgID`, `ShareYN`, `EditableYN`) gate visibility beyond consent.

Implication for STEVI:
- We need a consent record + per-org allow list.
- The consent decision should be evaluated in combination with org membership and module permissions.
- Optional: future "record-level share" flags can be added later; not required for v1.

## Ontario best-practice guidance (summary)
Primary sources to keep on hand (external):
- Ontario information-sharing guidance (multi-statute context).
- IPC PHIPA guidance on consent, collection/use/disclosure.

Key principles to encode:
- Consent must be knowledgeable, relate to the information, and not be obtained through deception.
- Express consent is required when disclosing to non-custodians or for purposes beyond direct care.
- Consent can be withheld or withdrawn at any time.
- Disclose only what is necessary for the intended purpose.
- Document consent scope, restrictions, and any withdrawal in a durable audit trail.
- Present consent in plain language with trauma-informed choices and no coercion.

Recommended internal reference links:
- https://www.ontario.ca/page/guidance-information-sharing
- https://www.ipc.on.ca/en/health-individuals/consent-and-your-personal-health-information
- https://www.ipc.on.ca/en/health-organizations/collection-use-and-disclosure-of-personal-health-information/disclosure
- https://www.ipc.on.ca/en/health-organizations/collection-use-and-disclosure-of-personal-health-information

## Target behavior (requirements)
1) Clients are prompted to consent to data sharing across participating orgs during onboarding.
2) Clients can opt out of specific orgs while still consenting to others.
3) Clients can later change, revoke, or re-enable consent.
4) Consent decisions are enforced server-side (RLS) and audited.
5) Staff/admin workflows can view and update consent (with reasons) and record verbal consent.
6) Consent changes update access grants (if grants are used for enforcement).
7) Consent expires automatically after 90 days (configurable), requiring renewal.

## Supabase schema check (2025-12-24)
Post-implementation notes:
- `core.person_consents`, `core.person_consent_orgs`, `core.person_consent_requests` added with RLS and supporting views/functions.
- `core.people` no longer includes `data_sharing_consent`; `privacy_restrictions` remains.
- `core.person_access_grants` continues to exist with `expires_at` aligned to consent expiry (code alignment; backfill recommended).
- `core.people_activities` used for minimal consent contact logging.
- `portal.public_settings` stores configurable consent expiry days.

## Proposed data model (v1)
Note: Schema is shared across STEVI/OPS/marketing. Coordinate changes via Supabase MCP before migrations.

### Legacy fields
- `core.people.data_sharing_consent` was removed on 2025-12-24.
  - Do not reintroduce legacy consent flags; use `core.person_consents` exclusively.

### New tables (core schema)
1) `core.person_consents`
   - `id uuid primary key`
   - `person_id bigint not null`
   - `consent_type text not null` (ex: "data_sharing")
   - `scope text not null` (ex: "all_orgs" | "selected_orgs" | "none")
   - `status text not null` (ex: "active" | "revoked" | "expired")
   - `captured_by uuid/null` (profile/user id)
   - `captured_method text` (ex: "portal" | "staff_assisted" | "verbal" | "documented")
   - `policy_version text/null` (tie to `portal.policies` revision metadata)
   - `notes text/null`
   - `created_at timestamptz default now()`
   - `updated_at timestamptz`
   - `revoked_at timestamptz/null`
   - `revoked_by uuid/null`
   - `expires_at timestamptz/null` (set from configurable expiry window)
   - `restrictions jsonb/null` (freeform: safety notes, scope restrictions)
2) `core.person_consent_orgs`
   - `id uuid primary key`
   - `consent_id uuid not null -> core.person_consents.id`
   - `organization_id bigint not null -> core.organizations.id`
   - `allowed boolean not null`
   - `set_by uuid/null`
   - `set_at timestamptz default now()`
   - `reason text/null`
3) `core.person_consent_requests` (new; supports streamlined org workflow)
   - `id uuid primary key`
   - `person_id bigint not null -> core.people.id`
   - `requesting_org_id bigint not null -> core.organizations.id`
   - `requested_by_user_id uuid not null`
   - `requested_by_profile_id uuid/null -> portal.profiles.id`
   - `requested_at timestamptz default now()`
   - `purpose text not null` (short, non-sensitive)
   - `requested_scopes text[] not null` (defaults to standard scopes)
   - `status text not null` (pending | approved | denied | expired)
   - `decision_at timestamptz/null`
   - `decision_by uuid/null` (IHARC staff)
   - `decision_reason text/null`
   - `expires_at timestamptz/null` (short window for request validity)
   - `metadata jsonb/null` (optional, non-sensitive)

### Views (name-only visibility)
- `core.people_name_only` view:
  - Columns: `id`, `first_name`, `last_name`, optional `person_type`, optional `last_service_month` (not exact date).
  - RLS allows org users without consent to search/select only this view.
- Optional `core.people_name_only_search` view (if you want to enforce min-length search server-side).

### Optional RPCs (recommended for strict writes)
- `core.request_person_consent(p_person_id bigint, p_org_id bigint, p_purpose text, p_requested_scopes text[], p_note text)`:
  - SECURITY DEFINER; inserts into `core.person_consent_requests` with strict validation.
  - Allows org users to submit requests without direct table INSERT.
- `core.log_consent_contact(p_person_id bigint, p_org_id bigint, p_summary text)`:
  - SECURITY DEFINER; inserts a minimal `people_activities` record with `activity_type = 'consent_contact'` and no sensitive fields.
  - Keeps “write without read” tightly scoped.

### Optional helper view/functions
- `core.v_person_consent_effective` view (latest active consent per person + scope + updated_at).
- `core.fn_person_consent_allows_org(person_id, org_id)` returns boolean for RLS.
- `core.fn_person_consent_is_expired(person_id)` returns boolean (or include expiry in `v_person_consent_effective`).

### Configurable expiry (90 days by default)
- Add a settings source for expiry window in days (default 90).
  - Preferred: `portal.public_settings` or a dedicated `portal.settings` key so admins can adjust without code changes.
  - Alternative: environment variable (fallback only; avoid hardcoding).
- Suggested `portal.public_settings` key: `consent.expiry_days` (type `number`).
- On consent capture or refresh, set `expires_at = now() + interval '<expiry_days> days'`.
- Status resolver treats consent as invalid when `expires_at < now()`.

### Migration/backfill
- Backfill completed in `20251224_consent_system.sql` using the legacy column before removal:
  - `true` -> new consent record scope = `all_orgs`.
  - `false` -> scope = `none`.
  - `null` -> no consent record; onboarding remains incomplete.
- Legacy column removed in `20251224_drop_people_data_sharing_consent.sql`.
- Initial org allow list:
  - If scope = `all_orgs`, insert allowed=true for all participating orgs (or evaluate on read).
  - If scope = `selected_orgs`, insert only those selected.
 - Seed consent expiry:
   - Set `expires_at = now() + interval '<expiry_days> days'` for backfilled rows.

## Enforcement strategy
Choose one of the following. Recommended: A + B together.

### Option A (recommended): RLS checks consent tables directly
- RLS uses `fn_person_consent_allows_org(person_id, portal.actor_org_id())` and ensures consent is not expired.
- Ensures access rules are enforced even if grants drift.
- Add a separate policy/view for name-only access:
  - `core.people` remains fully protected.
  - `core.people_name_only` allows limited fields without consent.

### Option B (recommended): Derive `person_access_grants` from consent
- Use consent changes to create or revoke org grants for the configured scopes.
- Allows fine-grained scopes (view vs update_contact) and fits existing patterns.
- Requires a deterministic "grant sync" function invoked by server actions.

### Update to default grants
- `processClientIntake` currently grants org access regardless of consent.
- Must change to:
  - If consent scope allows org, create grants.
  - If not, skip or create only minimal internal IHARC grants.

## UX and workflow changes

### Client onboarding (data sharing step)
- Default selection: "Share with all participating orgs" (explicitly chosen, not implicit).
- Require an explicit confirmation checkbox before save.
- Show org list with opt-out toggles and a "Why this matters" explainer.
- If user chooses "IHARC only", show consequences clearly (slower referrals, orgs cannot see).
- Store:
  - Consent record with scope `all_orgs` or `selected_orgs` or `none`.
  - Org allow list if `selected_orgs` or explicit opt-outs.
  - `expires_at` based on the configured expiry window (90 days default).

### Client profile consents
- Display:
  - Current consent status, last updated, scope.
  - Allowed orgs vs blocked orgs.
  - Privacy notes and preferred contact (existing fields).
- Actions:
  - Change scope (all orgs / selected / none).
  - Toggle individual orgs.
  - Withdraw consent (sets status revoked, scope none).
  - Renew consent (extends `expires_at` and logs action).
- Confirmations:
  - Acknowledge consequences when revoking or blocking an org.

### Staff/admin tools
- New admin view under `/app-admin/consents` or `/app-admin/clients/[personId]`:
  - Consent history timeline, active scope, org allow/deny list.
  - Admin override with reason and method (verbal, documented, etc).
  - Consent expiry and renewals (renewal triggers, status, last renewed date).
- Partners:
  - Partner-org users may assist onboarding only if their org is allowed.
  - Partner users cannot change consent scope (read-only).

## Audit logging
All consent mutations must call `logAuditEvent` with:
- action: `consent_created`, `consent_updated`, `consent_revoked`, `consent_org_updated`
- entityType: `core.person_consents`
- entityRef: person + consent id
- meta: before/after scope, allowed orgs, actor role, method, reason

## Implementation phases

### Phase 1 - Design and schema
Deliverables:
- Final schema (tables + view/functions).
- RLS plan.
- Data migration outline.

Tasks:
1) Confirm participating organizations list and desired default scopes.
2) Confirm consent categories (data sharing applies to all data except name; no data-category splits in v1).
3) Create migration in `supabase/migrations`.
4) Add RLS policies and helper functions.

### Phase 2 - Server actions and consent engine
Deliverables:
- Server actions to read/write consent records.
- Consent evaluation helper.

Tasks:
1) Add `src/lib/consents/*` module:
   - `getEffectiveConsent(personId)`
   - `listConsentOrgs(consentId)`
   - `saveConsent(...)`
   - `updateConsentOrg(...)`
2) Update onboarding action `saveSharingPreferenceAction` to write consent records.
3) Update `updateConsentsAction` and admin override actions to use new model.
4) Implement grant sync (if Option B chosen).
5) Add expiry evaluation in status resolver and consent queries.

### Phase 3 - UI updates
Deliverables:
- Updated onboarding SharingCard with org list + opt-out.
- Updated client profile consents page.
- Admin consent view.

Tasks:
1) `src/components/client/onboarding/sections/SharingCard.tsx` update.
2) `src/app/(client)/profile/consents/page.tsx` update.
3) Build `/app-admin/consents` or `/app-admin/clients/[personId]` page.

### Phase 4 - Data migration and rollout
Deliverables:
- Backfill existing records.
- Remove legacy column.
- Feature flag or staged rollout.

Tasks:
1) Backfill from legacy column (completed in `20251224_consent_system.sql`).
2) Drop legacy column (completed in `20251224_drop_people_data_sharing_consent.sql`).
3) Verify RLS with Supabase MCP (`pg_policies`, access checks).
4) Add migration tests or SQL validation steps.

### Phase 5 - Testing and validation
Deliverables:
- Unit + integration tests + e2e checks.

Tests:
- Unit: consent evaluation for each scope.
- Integration: RLS denies access when org is not consented.
- E2E: onboarding flow, consent changes, admin overrides.

## Remaining work (as of 2025-12-24)
1) Add audit logging for consent searches (ops consent request search activity).
2) Add client-visible consent history (optional but recommended for transparency).
3) Backfill `person_access_grants.expires_at` for existing grants to match latest consent expiry.
4) Decide whether `case_mgmt.case_management` RLS should gate user-grant access by consent; update policies if required.
5) Implement test coverage outlined in Phase 5.

## Acceptance criteria (v1)
- Client can consent to all orgs by default, then opt out specific orgs.
- Consent state is stored as a durable record with org allow list.
- Consent changes are enforced by RLS for partner org access.
- Audit log captures every consent change.
- Admin tools allow overrides and show consent history.
- Backfill migrates existing consent state without data loss.
- Consent expiry defaults to 90 days and is configurable.
- Expired consent behaves like "no consent" until renewed.

## Decisions (from product owner)
- Consent applies to all data except name. Name can be visible to enable staff/org users to identify and request/record consent when needed.
- Consent expires after 90 days by default and must be configurable.
- No organizations are excluded by default.
- Focus is on a rock-solid foundation suitable for pre-production hardening.

## Notes on “write without read”
- The requirement suggests org users may need to create activities/notes even when they cannot read the full record.
- This must be carefully scoped to avoid PHIPA violations:
  - Allow write to a minimal "contact/consent request" activity that does not expose other PHI.
  - Do not allow read of any sensitive fields without consent.
  - RLS can allow INSERT on a narrow table/columns while denying SELECT, but only if the insert payload avoids sensitive data.
  - All such writes must be audit logged with clear purpose and actor org.
  - Use `core.person_consent_requests` for a dedicated consent request workflow (see schema section).

## Expanded concept: Name-only visibility + consent request workflow
This section operationalizes the “write without read” requirement while keeping org workflows fast and aligned with Ontario privacy guidance.

### 1) Name-only visibility model (minimum necessary)
Goal: let org users identify a person without accessing PHI, so they can initiate a consent request or document a minimal encounter.

Recommended visibility for non-consented orgs:
- Always visible: `person_id`, `first_name`, `last_name` (or chosen name).
- Optional, if needed for disambiguation (non-PHI): year-of-birth or age band, and a “last seen month” (not exact date).
- Never visible without consent: contact info, case notes, documents, medical/health details, appointments, service history.

Best-practice guardrails:
- Require a reason for access/search (“consent request” or “service contact”).
- Log all searches that return name-only results (actor org, user, timestamp, reason).
- Enforce minimum search input length (already in directory logic) to reduce “fishing”.

### 2) Consent Request workflow (streamlined for orgs)
Goal: allow partner orgs to request consent without needing existing access.

Proposed flow:
1) Org user searches by name and selects the person from name-only results.
2) Org user submits a “Consent Request” form:
   - Purpose of sharing (referral, service coordination, etc).
   - Requested scope (view contact info, view case notes, etc) — defaults to standard scope.
   - Optional context note (non-sensitive, short).
3) System creates a `core.person_consent_requests` record (strict schema; non-sensitive).
4) IHARC receives a queue item and can:
   - Approve (generates consent record + org allow flag).
   - Deny (keeps record hidden; notifies org).
   - Request more info.
5) Org user sees only request status (pending/approved/denied) — not underlying PHI.

Implementation guardrails:
- Org users submit requests via `core.request_person_consent(...)` (RPC).
- Org users can only SELECT their own request status with minimal fields (id, status, created_at) via a restricted view.
- Org users can view only their own request status (id, status, created_at).
- IHARC can view full request content and decision.

### 3) Minimal “write without read” activities
Some org workflows need to log that contact occurred even before consent.

Approach:
- Use a SECURITY DEFINER RPC (`core.log_consent_contact`) to insert a minimal activity:
  - `person_id`, `provider_org_id`, `created_by`, `activity_type = consent_contact`, `title`, `description` (short, non-sensitive), `metadata`.
- RLS:
  - Disallow direct INSERT into `core.people_activities` for org users.
  - Allow the RPC to insert on their behalf with strict validation.
  - Org users can SELECT only their own minimal activity metadata (id, timestamp, status) via a view if needed.
  - IHARC can view full activity for coordination.
- Prevent use of this pathway for full case notes; keep scope strictly minimal.

### 4) Renewal and expiry (90 days default)
Streamlined renewal:
- 30/14/7 day reminders before expiry (email/SMS/portal banner).
- One-click renew for clients, or staff-assisted renewal with verbal consent capture.
- On expiry:
  - Revert access to name-only view.
  - Org users can still submit consent requests.

### 5) Emergency or safety exceptions (policy alignment)
Do not automatically add “break-glass” access in v1.
- If required later, implement a strict “break-glass” process:
  - Requires reason code, time-bounded access, automatic audit, and IHARC admin review.
  - Must be approved by privacy governance before enabling.

### 6) Streamlined org workflows (UX)
For partner org users:
- A single “Find person / Request consent” screen.
- Clear “You do not have consent” banner with a CTA to request consent.
- Status badges for outstanding requests.
- No complex toggles unless consent is granted.

For IHARC staff:
- Unified consent queue:
  - filter by org, priority, expiry window.
  - approve/deny with reason.
  - show consent history timeline.

## Best-practice checklist (implementation guardrails)
- Data minimization: only name visible without consent.
- Purpose limitation: store and display the reason for any consent request.
- Consent is revocable: allow immediate withdrawal and block access instantly.
- Audit everything: searches, consent updates, approvals/denials, renewals.
- Avoid UI-only gating; enforce via RLS and server actions.

## Implementation notes for future Codex
- Use Supabase MCP to inspect RLS before modifying.
- Do not rely on UI-only gating; enforce in server actions and RLS.
- Keep onboarding contract in `docs/onboarding-contract.md` in sync with this plan.
