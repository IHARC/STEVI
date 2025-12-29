# CAD / Call for Service (CFS) Implementation Plan

This plan focuses on reintroducing a Computer Aided Dispatch / Call for Service workflow tailored to outreach operations while enabling future multi-organization collaboration. It is grounded in what already exists in Supabase and emphasizes security, auditability, and operational clarity.

**Pre-production scope note**: The app is pre-production, so larger database changes are acceptable to ensure a durable, intuitive CFS feature set. Prefer clean, normalized structures and safe-by-default access patterns over minimal-diff patches.

## 1) What Already Exists in Supabase (Discovery)

### 1.1 Core Tables (case_mgmt schema)

**`case_mgmt.calls_for_service`**
- Primary intake record for a call/report.
- Key fields:
  - Identity + intake: `id`, `report_number` (RPT-YYYY-#####), `report_received_at`, `report_method`, `initial_report_narrative`.
  - Reporter: `reporting_person_id` (core.people), `reporting_organization_id` (core.organizations), `anonymous_reporter` + details, `reporter_*` contact fields.
  - Triage/verification: `report_priority_assessment`, `urgency_indicators` (jsonb), `call_taker_id`, `verification_status`, `verification_method`, `verification_notes`, `verified_at`, `verified_by`.
  - Status + lifecycle: `report_status` (active/escalated/resolved/duplicate/false_alarm/archived).
  - CFS-specific lifecycle: `origin` (community|system), `source` (web_form|phone|sms|email|social|api|staff_observed), `status` (received|triaged|dismissed|converted), `received_at`, `triaged_by`.
  - Location: `reported_location`, `reported_coordinates`, `location_confidence`, `location_text`.
  - Dedupe: `related_report_ids`, `duplicate_of_report_id`, `dedupe_key`.
  - Escalation/Conversion: `escalated_to_incident_id`, `converted_incident_id`, `escalated_at`, `escalated_by`.
  - Notifications: `notify_opt_in`, `notify_channel` (none|email|sms), `notify_target`, `public_tracking_id`.
  - Orgs/agency context: `referring_organization_id`, `referring_agency_name`.
  - Auditing: `created_at/created_by`, `updated_at/updated_by`.
- Constraints of note:
  - `report_method`: phone, walk_in, social_media, email, radio, agency_transfer, online_form.
  - `report_priority_assessment`: immediate, urgent, routine, informational.
  - `verification_status`: pending, verified, unverified, unable_to_verify.
  - `verification_method`: callback, field_check, agency_confirm, cross_reference, none_required.
  - `location_confidence`: exact, approximate, general_area, unknown.
  - Reporter validity: exactly one of (person, organization, or anonymous).
- Indexes: received_at, report_received_at, report_method, report_status, reporting_organization_id, reporting_person_id, dedupe_key, plus primary/unique report_number.
- **RLS is currently disabled**.

**`case_mgmt.cfs_timeline`**
- Phase/timeline tracking per CFS.
- Key fields: `incident_report_id`, optional `incident_id`, `phase`, `sub_phase`, `phase_started_at`, `phase_completed_at`, `phase_status`, `performed_by`, `duration_seconds`, `sla_target_seconds`, `sla_met`, `phase_notes`, `phase_data` (jsonb).
- Phase constraints: intake, verification, assessment, dispatch, response, resolution, follow_up, closed.
- Phase status: pending, in_progress, completed, skipped, failed.
- Indexes: incident_report_id, incident_id, (phase, phase_status).
- **RLS is currently disabled**.

**`case_mgmt.incidents`**
- Operational incident record (already very CAD-like):
  - Dispatch/response: `dispatch_priority` (informational|low|medium|high|critical), `dispatch_at`, `first_unit_assigned_at`, `first_unit_arrived_at`, `incident_cleared_at`, `response_time_minutes`, `total_incident_time_minutes`.
  - Operational fields: `incident_type`, `status`, `incident_complexity`, `public_safety_impact`, `multi_agency_response`, `incident_commander`, `agency_coordination_notes`.
  - Location + hazards: address fields, `latitude/longitude`, `environmental_factors`, `substance_indicators`, `scene_safety`, `safety_concerns`.
  - People/services/notes: `incident_people` (jsonb), `services_offered`, `services_provided`, `resources_distributed`, `referrals_made`, `actions_taken`, `follow_up_*`.
  - CFS link: `incident_report_id` (FK to calls_for_service).
- RLS: IHARC-only policies currently.

**Related tables**
- `case_mgmt.incident_people` + `incident_person_medical` for person involvement and medical details.
- `case_mgmt.incident_links` for linking incidents to other records.

### 1.2 Enums (core schema)
- `cfs_origin_enum`: community, system.
- `cfs_source_enum`: web_form, phone, sms, email, social, api, staff_observed.
- `cfs_status_enum`: received, triaged, dismissed, converted.
- `notify_channel_enum`: none, email, sms.
- Incident enums already exist (priority, type, complexity, safety impact, etc).

### 1.3 RLS State
- `calls_for_service` and `cfs_timeline`: **RLS disabled**, no policies.
- `incidents` and other case_mgmt tables: policies are **IHARC-only** today.

## 2) Target Scenarios (Operational Context)

1) **Public reports**: drug paraphernalia pickups/cleanups, open drug use, loitering, unsafe encampments, public safety concerns.
2) **Client requests**: direct outreach support, wellness checks, transport help, supplies, follow-up.
3) **Staff observed**: field staff create a CFS on-the-spot for tracking and response.
4) **Agency referrals**: calls from partner orgs (shelters, city teams, EMS, community services).
5) **Digital intakes**: web form, SMS, email, or API-submitted reports.

## 3) End-to-End Workflow (Expected)

### 3.1 Intake
- Create `calls_for_service` record with `origin`, `source`, `report_method`, narrative, reporter fields, initial location info.
- Set `status=received` and `report_status=active`.
- Create `cfs_timeline` phase: `intake` (pending → completed).

### 3.2 Triage + Verification
- Triage sets `report_priority_assessment`, `urgency_indicators`, `triaged_by`.
- Verification updates `verification_status/method/notes`.
- Timeline phases: `verification`, `assessment`.

### 3.3 Dispatch / Assignment
- Determine if the call is: dismissible, duplicate, or converted into an incident.
- If converted, create `incidents` row, set `calls_for_service.converted_incident_id` + `incidents.incident_report_id`.
- Timeline phase: `dispatch`.

### 3.4 Field Response
- Use `incidents` for operational logging, notes, and people/services data.
- Add `incident_people` and medical details if relevant.
- Timeline phase: `response`.

### 3.5 Resolution + Follow-Up
- Close out incident details and complete follow-up requirements.
- `cfs_timeline` phases: `resolution`, `follow_up`, `closed`.
- Set `calls_for_service.status` to `converted` or `dismissed`, `report_status` to `resolved` or `duplicate`.

### 3.6 Dedupe / Merge
- Use `dedupe_key`, `duplicate_of_report_id`, `related_report_ids`.
- Provide UI to merge or link related calls; record decision notes.

### 3.7 Multi-Org Collaboration
- Shared visibility by organization and consent (see Section 4 + 5).
- Cross-org incident handoff and co-response tracked in `incident_links` and timeline notes.

## 4) Data Model Plan (Gaps + Adjustments)

### 4.1 Ownership + Collaboration
Current `calls_for_service` has reporter org and referring org, but no explicit **owning/handling** org.

Recommended additions (decision + rationale):
- **Decision**: introduce an explicit `calls_for_service.owning_organization_id` (core.organizations) and keep exactly one owner at all times.
  - **Why**: CAD-style systems always establish a primary agency for accountability, dispatch ownership, SLA tracking, and reporting. It also removes ambiguity for mobile staff and allows clear queue ownership.
- **Default auto-assignment (usability-first)**:
  - Staff-created call: owning org = staff member's acting org.
  - Partner org submission: owning org = `reporting_organization_id`.
  - Anonymous/community: owning org = system host org (e.g., IHARC/tenant default).
  - **Always editable** with a “Transfer ownership” action for handoffs.
- **Collaboration without ownership loss**:
  - Add `case_mgmt.cfs_org_access` (recommended over jsonb) with `cfs_id`, `organization_id`, `access_level` (view|collaborate|dispatch), `granted_by`, `granted_at`, `reason`.
  - Enables mutual aid and co-response while preserving a single accountable owner.
- **Attribution**: add `organization_id` on `cfs_timeline` so phase actions can be linked to an org, not just a user.

### 4.2 Person Data Sharing (Consent)
Use existing consent framework:
- `core.person_consents`, `core.person_consent_orgs`, `core.person_consent_requests`.
- Gate person-related fields in CFS views based on consent scopes.
- For anonymous or community-reported calls, keep person records optional.

### 4.3 Classification & SLA
Keep existing constraints but standardize:
- Map `report_priority_assessment` to `incidents.dispatch_priority`.
- Track SLA in `cfs_timeline.sla_target_seconds` + `sla_met`.
- Consider a `call_type` taxonomy aligned with `incident_type_enum` + domain-specific categories (cleanup, outreach, welfare check, etc).

### 4.4 Attachments + Media
Store metadata in CFS and incident tables; actual files in storage:
- Add `case_mgmt.cfs_attachments` table or use a generic attachments table with `source_type=call_for_service`.
- Enforce org-scoped storage policies.

### 4.5 Public Tracking (Decision + Safe Defaults)
Public tracking improves transparency for community reports, but must never leak PII or sensitive incident details.

Decision (best practice + usability):
- **Opt-in only** per call (default off). Enable only for low-risk, non-person-specific requests (e.g., cleanup, general outreach, welfare check requests).
- **Never public**: medical/mental health, overdose, police-type reports, or any call involving identified individuals.
- **Public data is minimal and de-identified**:
  - Status bucket: received → triaged → dispatched → in_progress → resolved.
  - Last updated (rounded time).
  - General category (cleanup/outreach/welfare_check/other).
  - **Coarse location only** (neighborhood/cross-streets). Never exact address or coordinates.
  - Optional short “public update” string (templated, staff-editable).

Implementation preference (pre-production):
- Create a **separate public-tracking table or view** to avoid accidental exposure:
  - **Preferred**: `case_mgmt.cfs_public_tracking` with `public_tracking_id`, `cfs_id`, `status_bucket`, `category`, `public_location_area`, `public_summary`, `last_updated_at`.
  - Only write/update this table when a call is eligible and public tracking is enabled.
  - Public endpoint reads **only** from this table/view.
- Keep `calls_for_service.public_tracking_id` as the join token, but do not expose the main CFS table to public access.

## 5) Security & Compliance (Best Practices)

1) **Enable RLS** on `calls_for_service` and `cfs_timeline`.
2) **Org-scoped policies** based on `owning_organization_id` or `cfs_org_access`.
3) **Role-based permissions** via `core.user_org_roles` and `core.org_role_permissions`.
4) **Consent-aware reads** for linked people data.
5) **Audit trail**: rely on `created_by/updated_by` and add activity logs if needed.
6) **Least privilege**: avoid exposing reporter PII to organizations without consent.

## 6) API / Service Layer (Supabase + App)

### 6.1 RPC / Transactions
Implement RPCs to keep operations consistent:
- `cfs_create_call(...)`: creates call + intake timeline.
- `cfs_triage(...)`: updates priority + timeline.
- `cfs_convert_to_incident(...)`: creates incident + links both records + dispatch timeline.
- `cfs_mark_duplicate(...)`: links duplicate and updates status.

### 6.2 Views for UI
Create views for:
- **CFS queue**: status filters, priority, time since received.
- **My org calls**: org-scoped default.
- **Public tracking**: minimal fields by `public_tracking_id` (served from `cfs_public_tracking` or a safe view).

## 7) UI / UX Plan

1) **CFS Queue (Dispatcher)**:
   - Filters: status, source, priority, age.
   - Actions: triage, verify, assign, convert, dismiss, mark duplicate.
2) **CFS Detail**:
   - Reporter info (conditional), location, narrative.
   - Timeline: all phases + notes.
   - Conversion to incident.
3) **Incident Detail**:
   - Dispatch + response fields.
   - People + services + outcome.
4) **Mobile/Field**:
   - Quick add notes, update status, capture location.
5) **Partner Org Collaboration**:
   - View-only vs collaborate permissions.
   - Consent prompts when accessing person data.
6) **Public Tracking (Optional)**:
   - Public tracking screen uses only sanitized fields (status bucket, category, coarse location, short update).
   - Use a simple “Track this request” flow for reporters with a masked tracking token.

## 8) Notifications & Communications

Use `notify_opt_in`, `notify_channel`, `notify_target`:
- Edge Function to send updates on status changes.
- Templates per status (received, in progress, resolved).
- Rate limiting + opt-out handling.

## 9) Reporting & Metrics

Recommended dashboards:
- Time to triage, time to dispatch, time to resolution.
- Calls by source, type, location.
- Duplicate/false alarm rate.
- Org collaboration metrics.

## 10) Phased Delivery (Recommended)

**Phase 1: Secure CFS Core**
- Enable RLS, add org ownership, CFS queue UI, basic intake/triage.

**Phase 2: Incident Conversion**
- Implement convert-to-incident flow, field response logging, SLA tracking.

**Phase 3: Multi-Org Collaboration**
- Org access sharing, consent enforcement, partner workflows.

**Phase 4: Automation + Reporting**
- Notification automation, analytics dashboards, advanced routing rules.

## 11) Decisions & Defaults (Q1/Q2 resolved)

### 11.1 SLA targets (recommended defaults)
These targets balance first-response best practices with outreach realities (triage first, then dispatch/response):

| Priority | Triage target | Dispatch/assignment target | Resolution target |
| --- | --- | --- | --- |
| Immediate | 15 minutes | 30 minutes | Same shift |
| Urgent | 60 minutes | 4 hours | 24 hours |
| Routine | 4 hours | Next business day | 3 business days |
| Informational | 1 business day | As scheduled | 5 business days |

**Rationale**: Outreach teams require enough time for safe staging and multi-agency coordination; separating triage and dispatch targets keeps the queue responsive without forcing unsafe timelines. Targets are editable by org once real-world data is collected.

### 11.2 Historical CFS migration (recommended approach)
**Recommendation**: Do **not** migrate legacy CFS records unless there is a legal or operational requirement. This is a pre-production app; importing legacy data risks mismatched schemas, inconsistent statuses, and noise in metrics.

If migration becomes necessary:
- Import into `calls_for_service` with `origin=system` and `source=api`.
- Set `report_status=archived` and `status=converted` or `dismissed` to avoid polluting active queues.
- Preserve `report_number` mapping and store legacy IDs in `dedupe_key` or `report_source_details`.

### 11.3 Staff-created defaults
**Decision**: Staff-created calls default to `origin=system` and `source=staff_observed`, with ownership set to the acting org. This matches CAD conventions for “unit-initiated” calls and keeps analytics clean.

## 12) Implementation Progress (Dec 29, 2025)

Completed:
- Database hardening + CFS collaboration model (ownership, org access, public tracking, RLS).
- RPCs for create/triage/verify/convert/dismiss/duplicate/share/transfer/public tracking.
- Ops UI: CFS queue, CFS create, CFS detail, incidents list/detail, public tracking page.
- Portal access + navigation wiring for CFS (feature flag + permissions).
- SMS-enabled notifications through portal relays (email + SMS support).
- CFS attachments (storage bucket, policies, upload/delete UI, metadata capture).
- SLA analytics view + CFS performance report page (triage/dispatch/resolution metrics).
- Person/org search widgets in CFS intake.

Remaining follow-ups:
- None (core plan delivered). Consider iterating on dashboards once production data is available.
