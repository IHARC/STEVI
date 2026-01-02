# STEVI Client Record & Continuum-of-Care Foundation — Vision + Roadmap
Last updated: 2026-01-02  
Status: Living plan (expect frequent edits)

## Why this document exists

The client record is the spine of STEVI. If the client record is noisy, confusing, or inconsistent, every user group (IHARC staff/volunteers, partner org staff, and clients) loses trust in the system and stops using it.

Today, the “client record” experience is partially implemented and heavily activity-feed driven. This document codifies a durable product vision and an implementation roadmap so future development remains aligned, even as STEVI expands from an IHARC-only alpha to a multi-organization pilot.

## Scope

This plan covers the **foundational** surfaces and models that make the client record useful across organizations:

- The client record information architecture (Ops + client portal).
- “No wrong doors” data capture (any legitimate staff can log what a client shares).
- Consent-based cross-org data sharing (org-level consent exists today; tiered consent comes later).
- Encounters (formerly “Visits”), timeline/events, and tasks (inbox/caseload as work queues).
- Domain records that attach to a client over time (starting with **medical**, then **justice**, then contacts/relationships, characteristics, etc.).

## Non-goals (for now)

- Full EHR / EMR functionality or clinical-grade charting.
- Automatic integration to hospital systems.
- Tiered consent / step-up gating implementation **now** (but we design for it).
- Implementing every domain module at once (we sequence work deliberately).

## Context and constraints

### Tenancy and rollout context

- **Alpha**: IHARC is the only organization using STEVI at launch.
- **Pilot** (expected): additional organizations onboard (e.g. foodbank, other outreach orgs).
- **Design requirement**: multi-tenant + cross-org continuum-of-care is core to STEVI’s mission, so we build foundations as if partner orgs will be present even during IHARC-only alpha.

### Consent model (current + future)

- Consent is **org-based**: a client can opt in/out of sharing with specific organizations.
- The codebase already contains an org-level consent system plan and implementation pieces (see “Existing docs” below).
- Tiered consent (“request access to sensitive domains”) is expected later. We must avoid architecture decisions that make it hard to add later.

## Existing docs that already express the intended direction

These are the current “plan fragments” this roadmap unifies:

- Canon end-to-end user flows (Encounter-first): `docs/Scenarios/Scenarios-1.md`
- Use cases + user stories backlog: `docs/use-cases.md`
- Encounter module vision + roadmap (Encounter-first UX details): `docs/encounter-module-vision-roadmap.md`
- Org-level consent plan: `docs/consent-system-plan.md`
- Onboarding/consent contract (who can do what): `docs/onboarding-contract.md`
- App map + feature inventory (what exists vs planned): `docs/app-map.md`
- Incident module plan (org-scoped, includes incident medical sub-records): `docs/incident-reports-plan.md`

## Problem statement (what we must fix)

### Symptoms (user-visible)

- Client “activity” and “caseload” views can surface operational events (e.g., distributions) as if they were casework, which is confusing and functionally incorrect.
- Staff can’t reliably answer basic questions like:
  - “What’s the next step for this client?”
  - “What’s the last verified hospitalization?”
  - “Do we have upcoming court dates?”
  - “Who is a safe emergency contact?”

### Root causes (system)

1) **Unscoped timeline**
   - Activities are stored as generic person-level rows and shown without meaningful partitioning (by case/encounter/org/domain).
2) **Overloaded “activity” as the database**
   - A single generic activity table becomes the dumping ground for everything, which prevents reliable “last known” summaries and domain-specific workflows.
3) **Queues aren’t queues**
   - Inbox/caseload are not driven by assigned work items with due dates; instead they’re driven by generic activity/case lists.
4) **Inconsistent provenance**
   - Some events store case linkage in JSON metadata, some don’t, and some UIs don’t even pass case context through.

## Vision (north star)

STEVI supports a **non-wrong doors** continuum-of-care:

- Any legitimate worker (outreach, foodbank, housing, health) can create an **Encounter** and log what the client shares, even if it’s unverified.
- The system distinguishes between:
  - **Client-reported** vs **staff-observed** vs **documented/verified** information.
  - **Operational service delivery** vs **care coordination** vs **sensitive clinical/legal domains**.
- Consent-based sharing makes information available across orgs when allowed, while preserving:
  - provenance (who recorded it, when, under which org/program),
  - auditability (who viewed/changed it),
  - and future gating (tiered access requests).

## Guiding principles (why we build it this way)

1) **Clients are the spine; Client Journey is canonical**  
   The person record is the anchor; everything else attaches to it over time.

2) **Encounter-first UX** (aka “Visit-first”, renamed to Encounter for clarity)  
   All frontline actions happen inside an Encounter to preserve provenance and reduce context switching.

3) **Work is explicit**  
   Tasks (assigned, due-dated) drive Inbox and Caseload. “Feeds” are not work queues.

4) **Structured domains, not just notes**  
   Medical, justice, contacts, and other domains must be first-class records so we can build summaries and safe sharing.

5) **Provenance + verification are mandatory**  
   We can be “no wrong doors” without becoming “anything goes” by clearly marking data quality and source.

6) **Consent-first sharing**  
   No cross-org access without consent/grants. Name-only discovery before consent remains the default.

7) **Future tiered access must be easy to add**  
   We include a `sensitivity_level` (or equivalent) and avoid designs that require rewriting every domain later.

## Terminology (mental model we design toward)

- **Person / Client**: the individual receiving services (`core.people`).
- **Organization (org)**: tenant organization (IHARC, foodbank, partner outreach).
- **Acting org**: the org context the staff member is acting under at the time of logging (already a core platform concept).
- **Case / Episode**: a longer-running coordination container (e.g., “Housing stabilization”, “Health navigation”). Cases are the unit of “ongoing work.”
- **Encounter**: a discrete interaction session (outreach contact, program drop-in interaction, intake appointment). Encounters generate events and tasks.
- **Timeline event**: something that happened, shown in the client journey (may be generated by domain records).
- **Task**: a work item with owner(s), due date, and status; the unit of Inbox/Caseload.
- **Domain record**: a structured record in a specific domain (Medical episode, Justice episode, Contacts/Relationships, Characteristics).

## Target user experience (Ops client record)

### Default navigation and framing

- **Today**: role-appropriate “start work” screen (New Encounter; work queues; intakes).
- **Clients hub**:
  - Directory (find/create)
  - Caseload (assigned episodes + next due task)
  - Work queue (tasks due soon / overdue)
- **Client profile** (Ops) is the primary workspace for care coordination:
  - Overview (high-level summaries)
  - Encounters (recent + start new)
  - Tasks (open tasks; create; assign)
  - Timeline (scoped; filterable)
  - Domains: Medical, Justice, Contacts, Documents, Referrals, Services/Supplies, Appointments
  - Sharing (consent + grants visibility)

### Non-wrong doors logging (example: “just discharged from hospital”)

When an outreach worker hears “I just got out of the hospital”:

1) Start/attach to an Encounter (Outreach).
2) Add a **Medical update**:
   - Marked as `client_reported`, `verification_status=unverified`.
   - Capture minimal fields: date/time, facility (if known), summary, follow-up needed.
3) Auto-create a **Task** (optional but recommended):
   - “Verify discharge details / follow-up plan”.
4) Display in the client record:
   - In Medical: visible immediately in “Recent medical updates”.
   - In Timeline: appears as a collapsed “Medical update” card (not mixed into “casework” by default).

### Multi-org usability defaults

- For IHARC-only alpha: the UX still shows provenance (org badge) even if it’s always IHARC, so the UI does not need to be redesigned later.
- For pilot: partner org users should see:
  - a clear consent/sharing indicator on every client, encounter, and sensitive domain view,
  - and a clear “why can’t I see this?” empty state when consent isn’t present.

## Target data architecture (foundation)

### Core design: separate “source of truth” from “what the timeline shows”

- **Domain records** are the source of truth (medical, justice, etc.).
- **Timeline events** are a projection layer that references domain records (so we can filter, redact, and summarize cleanly).

### Cross-cutting metadata contract (applies to every domain record)

Every new domain table should include (or be joinable to) a consistent set of fields:

- `person_id`
- `case_id` (nullable; not everything is case-scoped)
- `encounter_id` (nullable; not everything is captured in an encounter)
- `owning_org_id` (the org that created/owns the record)
- `recorded_by_profile_id` (who logged it)
- `recorded_at`
- `source` (client_reported | staff_observed | document | partner_org | system)
- `verification_status` (unverified | verified | disputed | stale)
- `sensitivity_level` (for future tiered access)
- `visibility_scope` (internal_to_org | shared_via_consent)

Rationale:
- This supports “no wrong doors” (client_reported allowed), quality control (verification), and future step-up gating.

### Proposed foundational tables (high-level)

> Note: exact schemas will be implemented in Supabase with RLS, audit logging, and indexes. The goal here is to commit to the *shape* early.

#### 1) Encounters (universal interaction record)

**Proposed:** `case_mgmt.encounters`

Key fields:
- `id`
- `person_id`
- `organization_id` (acting org / owning org)
- `case_id` (nullable)
- `encounter_type` (outreach | intake | program | appointment | other)
- `started_at`, `ended_at`
- `location_context` (nullable)
- `program_context` (nullable)
- `created_by_profile_id`, `created_by_user_id`

#### 2) Tasks (work queue)

**Proposed:** `case_mgmt.tasks`

Key fields:
- `id`
- `person_id`
- `case_id` (nullable)
- `encounter_id` (nullable)
- `owning_org_id`
- `assigned_to_profile_id` (or team)
- `status` (open | in_progress | blocked | done | canceled)
- `priority`
- `due_at` (nullable but encouraged)
- `title`, `description`
- `source_type` / `source_id` (what created it)

This table becomes the basis for:
- Inbox items (due soon / overdue / needing attention)
- Caseload “next step”
- SLA metrics later

#### 3) Timeline events (projection layer)

Option A (preferred long-term): create a dedicated event table (e.g. `core.timeline_events`)  
Option B (bridge): evolve `core.people_activities` into a true timeline event table (add `case_id`, `encounter_id`, category, etc.) while domain records mature.

Either way, the projection must support:
- `event_category` (contact | note | task | referral | service_delivery | medical | justice | appointment | consent | system)
- `source_type` / `source_id`
- `visibility_scope` and (future) `sensitivity_level`

#### 4) Medical (domain source of truth)

Existing: `core.medical_episodes` and related tables exist in the shared Supabase project, but are not yet surfaced in STEVI UI.

Approach:
- Use `core.medical_episodes` as the source of truth for medical history.
- Ensure every medical episode can be:
  - client-reported (unverified),
  - later verified (by clinical staff or documentation),
  - and summarized (“last known hospitalization”).

#### 5) Justice (domain source of truth)

**Proposed:** `core.justice_episodes` (or `core.legal_episodes`)

Examples:
- charges
- bail conditions
- parole/probation
- court dates

Same metadata contract as medical (client-reported allowed, unverified by default).

#### 6) Contacts and relationships

Current `core.people` has a single `related_person_id` field, which is not sufficient for real-world family/support networks.

**Proposed:** `core.person_relationships`

Key fields:
- `person_id`
- `related_person_id` (nullable; sometimes the contact is not a full person record)
- contact details snapshot (name/phone/email) when not a full record
- relationship type (family, friend, case worker, emergency contact)
- safe contact flags + notes
- provenance + verification

#### 7) Characteristics (physical descriptors and identifying traits)

**Proposed:** `core.person_characteristics` (versioned observations)

Examples:
- height, weight range, eye color, hair color
- tattoos/scars
- mobility aids

This must be versioned over time (observations change) and have provenance/verification.

## Consent and access enforcement (how this stays safe)

### Today (org-level consent)

- If an organization has active consent/grants to view a person, it should be able to view that person’s shared records (including medical/justice) according to the `visibility_scope`.
- Name-only discovery remains the pre-consent flow (no PHI before consent).

### Future (tiered consent / step-up gating)

We will not implement the workflow yet, but we commit to designing for it:

- Every domain record and timeline event can carry a `sensitivity_level`.
- Later we can add:
  - per-domain grant scopes (e.g., `medical.view_details`) **or**
  - a request/approval workflow that grants temporary access to sensitive records.

Because sensitivity is captured on records early, adding step-up gating later becomes a policy + UI change, not a massive schema rewrite.

## Roadmap (phased delivery)

### Phase 0 — Reduce confusion in the current client record (IHARC alpha unblockers)

Goal: stop treating “everything that happened to a person” as the default view for care coordination.

Deliverables:
- Case-scoped view in client profile when navigated with a case context.
- Clear separation of operational/service events vs casework events in the UI.
- Standardize event categories (even if still stored in `people_activities` temporarily).

Why now:
- It immediately fixes trust-breaking UX without requiring a full data model rewrite.

### Phase 0.5 — Client record corrections + inline editing MVP (pre-prod)

Goal: allow staff to correct inaccurate intake and domain data without adding heavy audit noise in pre-production.

Deliverables:
- Inline editing on Ops client profile for identity, contact, and situation fields.
- Editable domain records (medical, justice, relationships, characteristics) with update actions.
- Alias management with soft-delete semantics (aliases can be deactivated but never hard-removed).
- Audit logging for every save (one audit event per edit) with optional change reason and environment tagging for filtering.

Notes:
- MVP permissions: any Ops frontline/admin can edit; later integrate fine-grained roles/field-level gates.
- Intake corrections update the latest intake row in place for MVP; future upgrade can introduce formal amendment/versioning.

### Phase 1 — Encounters + Tasks (turn feeds into workflows)

Goal: deliver the Encounter-first UX described in `docs/Scenarios/Scenarios-1.md`, and make Inbox/Caseload task-driven.

Deliverables:
- `encounters` model and “Start Encounter” flow (outreach/intake/program).
- Task model and initial staff “My tasks” / “My caseload” experience.
- Inbox items come from tasks, not from generic activity rows.
- Timeline becomes an event projection (even if still backed by `people_activities` during transition).

Why:
- This is the primary foundation that makes STEVI usable across orgs and roles.

### Phase 2 — Medical module (non-wrong doors, consented sharing)

Goal: enable safe, structured capture and retrieval of medical history.

Deliverables:
- Ops “Medical” view with:
  - “Last known hospitalization” summary
  - recent medical updates (with verification status)
  - ability to log client-reported hospitalization from an encounter
- Auto-task creation for follow-ups (“verify details”, “connect to clinic”, etc.)

Why:
- Medical is a high-impact domain for outreach and a key continuum-of-care requirement.

### Phase 3 — Services and supplies as first-class encounter outputs

Goal: keep distributions and referrals inside Encounters while preserving inventory integrity.

Deliverables:
- Record supplies distribution as an Encounter output (source linking to inventory distributions).
- Timeline projection shows service delivery in a controlled way (not polluting “casework” views).

Why:
- This is central to the scenarios and prevents the exact “distribution noise” problem from recurring.

### Phase 4 — Justice module (court dates and conditions)

Goal: enable safe capture and retrieval of justice involvement that affects care planning.

Deliverables:
- Justice episodes + “next court date / bail conditions” summary cards.
- Tasks generated from upcoming court dates / check-ins when relevant.

Why:
- Justice involvement is common in outreach contexts and directly impacts safety and planning.

### Phase 5 — Contacts/relationships + characteristics

Goal: make “who to contact” and “how to identify safely” reliable and auditable.

Deliverables:
- Relationship/contact graph with safe-contact flags and provenance.
- Versioned characteristics capture and display.

Why:
- These are cross-cutting needs for every org type (outreach, housing, foodbank, health).

### Phase 6 — Cross-org coordination upgrades (post-pilot)

Goal: deepen the continuum-of-care experience once the foundation is proven.

Examples:
- Tiered consent / step-up access requests for sensitive domains.
- Shared care plan / goals (redaction-safe).
- Inter-org referrals with acceptance/feedback loop.
- Cross-org case participation models (care team).

## Implementation guardrails (to keep future work easy)

1) **Do not add domain fields to `core.people` unless truly “identity”**  
   Use domain tables so history is versioned and provenance is preserved.

2) **Avoid “metadata JSON as the data model”**  
   Metadata is for optional context, not core fields like `case_id`, verification, or sensitivity.

3) **Every mutation is auditable**  
   All writes go through server actions, respect RLS, and write one audit log entry per save (diff-based; no per-keystroke spam).

4) **Design for multi-org even in IHARC-only alpha**  
   Always record `organization_id`/`owning_org_id` and show provenance badges in UI.

5) **Queues must remain actionable**  
   Inbox and caseload should always be explainable as “tasks + due dates + assignments”.

6) **Pre-prod audit noise stays controlled**  
   Audit events should be tagged with environment and only recorded when data actually changes.

## Open questions (to resolve before Phase 1+)

- What is the minimum viable “Case/Episode” model for pilot orgs?
  - One case per org per person? Multiple concurrent cases? Shared/cross-org cases later?
- Who can mark a domain record “verified” (role-based)?
- What is the initial `sensitivity_level` taxonomy we want to adopt (even if gating is later)?
- What is the standard for conflict resolution when orgs record contradictory information?
- How should future amendment/versioning workflows be presented once formal clinical-grade auditing is required?
