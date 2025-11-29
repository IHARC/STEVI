# STEVI Onboarding & Consent Contract (v1)
Last updated: 2025-11-29

## Purpose
Define when a client is considered onboarded, what evidence is required, who can perform each action, and how copy is sourced. This document guides implementation, enforcement, and audits without adding new schema.

## Sources of truth
- People: `core.people`
- Intake/consents: `case_mgmt.client_intakes`
- Registration context: `portal.registration_flows` (historical/prefill only)
- Auth link: `core.user_people`, `portal.profiles`
- Policy copy: `portal.policies` slugs `client-service-agreement` (“Client Service Agreement”) and `client-privacy-notice` (“Privacy & Data Protection Notice”), category `governance` or equivalent.

## Completion definition
A client is **Onboarded** when all are true:
1) Active person record exists (`core.people.person_status` not `inactive`).
2) Service agreement accepted (`case_mgmt.client_intakes.consent_confirmed = true` for the person, most recent record wins).
3) Privacy statement acknowledged (`case_mgmt.client_intakes.privacy_acknowledged = true`).
4) Data sharing preference set on the person (`core.people.data_sharing_consent` boolean):
   - `false` = IHARC only
   - `true` = IHARC + partner organizations

**Not onboarded**: user is gated to the onboarding wizard; staff actions requiring consent are blocked server-side.

## Actor capability matrix (clients only; staff/partner assist clients)
| Actor | Create person | Start/continue wizard | Update sharing preference | Resend self-link | Link account↔person |
| --- | --- | --- | --- | --- | --- |
| Client (self, token/invite) | No (person may be pre-created) | Yes | Yes (for self) | Yes (self-request) | Yes (if auth present) |
| IHARC staff/admin | Yes (within RLS) | Yes (assisted) | Yes | Yes | Yes |
| Partner-org user (when sharing = true) | No | Yes (assisted) | No (cannot change sharing) | Yes (for the client) | No |

Partner-org assistance is permissible only when data sharing = IHARC + partners. Default grant scopes when sharing is enabled: `view`, `update_contact`. No `manage_consents` or timeline/note scopes unless explicitly granted by IHARC.

## Wizard spine (shared engine)
1) **Basic info**: minimal identifiers (legal/chosen name, safe contact options, DOB year/month, postal code). Prefill from latest `registration_flows` where available.
2) **Service agreement & privacy**: render live policy summary + full text from `portal.policies` slugs above; explicit acceptance checkboxes stored in `case_mgmt.client_intakes` (audit logged). No hardcoded text.
3) **Data sharing choice**: radio with default = “IHARC only”. Persist to `core.people.data_sharing_consent`. Show consequences plainly (partner access vs IHARC-only).
4) **Account link / confirmation**: link auth user to person/profile via `core.user_people` + `portal.profiles` when applicable. If no auth, skip without blocking completion for staff-assisted cases.

## Enforcement expectations
- Routing guard: clients hitting the portal are redirected to the wizard until `status === COMPLETED` from the onboarding status service.
- Backend checks: sensitive actions (e.g., partner sharing, certain case actions) must verify onboarding status server-side; UI hiding is insufficient.
- Current enforcement coverage: support requests, document requests, appointment requests/changes, client case updates, and consent edits all call the onboarding guard before mutating data.
- Rate limiting: public/token flows call `portal_check_rate_limit`.
- Audit: all mutations use `portal_log_audit_event` and include actor, person_id, step, and previous values where available.

## Content management
- Policy copy lives in Admin → Policies; marketing cache/tag invalidation must include these slugs so updates reflect across apps.
- HTML from editors is sanitized via `sanitize-resource-html`/`sanitize-embed` before persisting.

## Accessibility & trauma-informed defaults
- Plain-language, low-literacy copy; avoid acronyms without expansion.
- Keyboard/focus managed per step; clear primary/secondary actions; progress indicator; ability to resume.
- Default data sharing to “IHARC only”; require affirmative choice to expand sharing.

## Legacy flows
- Existing `portal.registration_flows` submissions are for context/prefill only and **do not** satisfy onboarding completion. Replace old public flows with the unified wizard.

## Implementation notes for engineers
- Status resolver: `src/lib/onboarding/status.ts` (read-only) returning `{ status, hasPerson, hasIntake, hasServiceAgreementConsent, hasPrivacyAcknowledgement, hasDataSharingPreference, personId?, profileId?, lastUpdatedAt }` using latest intake and person flags.
- Write actions: server actions/route handlers wrap person upsert, consent capture, sharing update, and account link; all return fresh status and log audit events. Use `createSupabaseServerClient` and honor RLS.
- Wizard: single component configured by actor type; staff/partner paths still onboard the client, not the staff/partner.
- Status resolver: implemented at `src/lib/onboarding/status.ts`; read-only, treats `status !== inactive` as active, pulls latest intake consent flags plus data sharing preference, and surfaces the freshest timestamp across intake, person updates, user-person link, or registration flow metadata as `lastUpdatedAt`.
- Portal guard: `(portal)/layout.tsx` redirects clients to `/onboarding` until `status === COMPLETED`; support, document, appointment, case update, and consent edit actions enforce onboarding server-side to prevent bypassing consent rules.
- Staff/admin visibility: `getOnboardingStatusForPeople` batches status lookups for directory views; admin client directory shows onboarding badges + filters, and the admin client detail page includes an onboarding history timeline.
