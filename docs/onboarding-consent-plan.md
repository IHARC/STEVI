# Onboarding & Consent Plan (living)
Last updated: 2025-11-29

## Purpose
Guide implementation of a unified onboarding/consent experience that honours IHARC’s trauma-informed, harm-reduction, and WCAG commitments while reusing existing Supabase schema and app patterns. This document is the single plan of record across Codex sessions.

## Guardrails & standards
- Reuse existing tables only (core.people, case_mgmt.client_intakes, portal.registration_flows, person_access_grants). No schema changes without Supabase coordination.
- All writes go through server actions using `createSupabaseServerClient`, enforce RLS, and log via `portal_log_audit_event`; public/anon flows stay behind `portal_check_rate_limit`.
- Consent/service-agreement copy is editable in Admin UI (portal.policies with Rich Text editor). The onboarding wizard must fetch live copy; nothing hardcoded in JSX/TS.
- Respect capability flags from `PortalAccess`; do not rely on client-only hiding for authorization.
- Sanitize any persisted HTML using existing utilities (`sanitize-resource-html`, `sanitize-embed`).

## Canonical onboarding contract (Phase 1 outcome)
- A person is **Onboarded** when:
  - Active person record exists in `core.people` (person_status != inactive).
  - IHARC service agreement accepted (source of truth: latest `case_mgmt.client_intakes.consent_confirmed = true` linked to person, or equivalent intake record agreed in registration flow metadata).
  - Privacy statement acknowledged (`case_mgmt.client_intakes.privacy_acknowledged = true`).
  - Data sharing preference recorded on the person (`core.people.data_sharing_consent`: false = IHARC only, true = IHARC + partner orgs).
- **Not onboarded** means UI access is limited to the wizard; staff actions that depend on consent must be blocked server-side.
- Actor capabilities (matrix to produce in Phase 1 deliverable): client self-serve (invite/token), staff-assisted onboarding for a client, and partner-org-assisted onboarding for a client (no non-client onboarding). Actions: create person, onboard existing, update sharing preference, resend self-link, link account↔person.
- Wizard step spine (shared by all actors): basic info → service agreement (summary + full text from admin-managed policy) → data sharing choice → account link/confirmation (if applicable).

## Phase tracker
| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| 1. Contract & flows | Freeze definitions, actor matrix, and wizard spine; map policy copy to admin-managed content | **Completed** | Contract published (`docs/onboarding-contract.md`), policy slugs set, actor matrix defined. |
| 2. Onboarding status service | Central resolver that answers “what’s missing” using existing tables | **Completed** | Resolver implemented in `src/lib/onboarding/status.ts` with unit tests; wired into portal layout guard and onboarding prefill. |
| 3. Write actions (APIs) | Stable server actions for info upsert, consent capture, sharing choice, account link; each returns status | **Completed** | Server actions added in `app/(portal)/onboarding/actions.ts` with audit logging, registration draft updates, and user-person linking. |
| 4. Unified wizard | Single configurable wizard for self/staff/partner using status + actions; pulls live policy copy | **Completed** | `/onboarding` wizard ships with actor-aware steps, live policy content, and progress tracking. |
| 5. Enforcement | Routing guard + action gating so incomplete onboarding cannot bypass consent rules | **In progress** | Portal layout redirects incomplete clients; support/document/appointment client actions now enforce onboarding. Further mutation sweep still required. |
| 6. Admin tools | Durable admin surfaces to view/reset onboarding and edit consent copy | **In progress** | Admin client view shows onboarding status + reset/resend actions; broader history/export + marketing cache tasks outstanding. |

## Phase details & acceptance criteria
### Phase 1 – Contract & flows
- Produce a 1–2 page contract document stored in `docs/` (or knowledge base) covering definitions above, actor matrix, and wizard step spine.
- Policy records for copy (create if missing) in `portal.policies`:
  - Slug `client-service-agreement`, label “Client Service Agreement”, category governance (or equivalent existing category).
  - Slug `client-privacy-notice`, label “Privacy & Data Protection Notice”, category governance.
  - Both editable via Admin → Policies with summary + full body; wizard pulls live content. No hardcoded text.
- Legacy registration flows: replace with the full onboarding wizard that includes consent steps; historical `registration_flows` data can prefill context but does **not** mark a client as onboarded.
- Output: signed-off contract referenced by engineering and ops.

### Phase 2 – Onboarding status service
- Location: server utility (e.g., `src/lib/onboarding/status.ts`) callable from RSC and server actions.
- Inputs: auth user id or person id. Reads `core.user_people`, `core.people`, latest `case_mgmt.client_intakes` for the person; may reference historical `portal.registration_flows` for prefill context only, not for completion.
- Output shape: `{ status: NOT_STARTED|NEEDS_CONSENTS|COMPLETED, hasPerson, hasIntake, hasServiceAgreementConsent, hasPrivacyAcknowledgement, hasDataSharingPreference, personId?, profileId?, lastUpdatedAt }`.
- No writes. Must return determinate results even when multiple records exist (prefer most recent by timestamp).
- Unit tests to cover edge cases: missing person, intake present but data sharing missing, revoked/changed preferences.

### Phase 3 – Onboarding write actions
- Implement server actions (or route handlers) that wrap all onboarding writes:
  - Upsert basic person info (using existing columns only) and create `user_people` link when applicable.
  - Record service agreement + privacy acknowledgement by inserting/updating `case_mgmt.client_intakes` for the person; ensure audit logging (`portal_log_audit_event`) and client-visible metadata when appropriate.
  - Record data sharing preference by updating `core.people.data_sharing_consent`; respect `manage_consents` scope and RLS.
  - Optional: update relevant `portal.registration_flows` row metadata for traceability without changing schema.
- Each action returns the fresh onboarding status (Phase 2) so callers know “what’s next”.
- Rate-limit public/token flows (`portal_check_rate_limit`), and ensure TipTap/HTML fields are sanitized when saved.

### Phase 4 – Unified onboarding wizard
- Single wizard component (e.g., `@/components/onboarding/wizard`) consuming status + actions; actor-type config controls prefilled/locked fields.
- Service agreement & privacy steps render admin-managed policies (fetched via policy slug) with short summary + expandable full text; no hardcoded prose.
- Accessibility: keyboard order, focus management per step, descriptive buttons, and safe defaults (no auto-opt-in to sharing). Language kept plain and low-literacy friendly for social services clients.
- Staff- or partner-assisted entry routes still onboard the client (not the staff/partner); permissions enforced server-side via `PortalAccess` and write actions.

### Phase 5 – Routing & enforcement
- Entry guard: on session load, call status service; redirect incomplete users to wizard route until `status === COMPLETED`.
- Staff surfaces: show status badge and filter in client lists using status service; avoid duplicate queries.
- Sensitive actions (e.g., org linking, case escalations) must check status server-side before proceeding; UI hints are not sufficient.

### Phase 6 – Admin tools & future-proofing
- Admin detail view per person shows onboarding status, consent flags, timestamps, and intake source references; read-only history where schema allows.
- Admin actions: resend onboarding link, mark as needing onboarding (via write action that resets status fields), update data sharing preference through same Phase 3 APIs.
- Content management: policies module remains the source for service agreement/privacy copy; ensure cache revalidation/webhook triggers keep marketing site in sync.

## Progress log
- 2025-11-29: Created living plan, aligned phases to STEVI standards, mandated admin-managed policy copy. Chose policy slugs (`client-service-agreement`, `client-privacy-notice`) and confirmed legacy registration flows will be replaced by the full consent-enabled wizard.
- 2025-11-29: Published contract (`docs/onboarding-contract.md`), defined actor matrix, set default partner-org grant scopes (view, update_contact only) when sharing is enabled.
- 2025-11-29: Began Phase 2 by adding the read-only onboarding status resolver (`src/lib/onboarding/status.ts`) that derives completion state from `core.user_people`, `core.people`, `case_mgmt.client_intakes`, and recent `portal.registration_flows`; covered with unit tests.
- 2025-11-29: Completed phases 2–4 by wiring the status resolver into the portal guard, building `/onboarding` wizard (actor-aware, policy-backed), and adding write actions for basic info, consents, sharing, and account linking. Added enforcement hooks to support/document/appointment client actions and admin status/reset/resend tools.

## Open questions / decisions needed
(None outstanding.)
