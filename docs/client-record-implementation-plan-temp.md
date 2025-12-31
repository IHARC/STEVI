# Client Record Foundation - Temporary Implementation Plan (Pre-Production)
Date: 2025-12-31
Status: Temporary execution plan (supersedes any legacy or transitional approach)

## Progress tracker (updated during execution)
- [x] Phase 0: Decisions + metadata contract locked
- [x] Phase 1: Encounters + Tasks foundation
- [x] Phase 2: Timeline projection + client record refresh
- [x] Phase 3: Medical module
- [x] Phase 4: Services/Supplies as encounter outputs
- [x] Phase 5: Justice module
- [x] Phase 6: Relationships + Characteristics
- [x] Types + RLS verification + QA notes

### Progress notes (execution log)
- Supabase schema + RLS policies validated; reference checks in `supabase/rls/client_record_rls_checks.sql`.
- Types refreshed to include encounters, tasks, timeline events, and domain provenance fields.
- Timeline filters centralized in `src/lib/timeline/filters.ts` with test coverage.
- Unit tests added for task queries and encounter creation.
- Lint/typecheck/tests green after query typing cleanup and encounter page guard.

## 0) Baseline snapshot (pre-execution state)
> Captured before implementation. Current state now reflects the completed phases above.

### Codebase (pre-execution)
- Ops client record uses `core.people_activities` as the Journey Timeline data source (`src/app/(ops)/ops/clients/[id]/page.tsx`).
- Ops clients hub provides Directory/Caseload/Activity views (`src/app/(ops)/ops/clients/page.tsx`) and relies on `core.staff_caseload` RPC (`src/lib/staff/fetchers.ts`) and `case_mgmt.case_management` data (`src/lib/cases/fetchers.ts`).
- "Visit" is a placeholder UX with no persistence (`src/app/(ops)/ops/visits/new/page.tsx`).
- Outreach quick logging writes to `core.people_activities` with `metadata.case_id` and `metadata.client_visible` (`src/lib/staff/actions.ts`).
- Client updates (portal) also write to `core.people_activities` (`src/lib/cases/actions.ts`).
- Consent system is implemented and used for visibility decisions (`src/lib/consents`, `getEffectiveConsent`).
- Costs and time tracking are live and already use audit logging and RLS-friendly server actions.

### Supabase (pre-execution)
Present and used:
- `core.people`
- `core.people_activities` (no case_id/encounter_id columns; uses `metadata` for context)
- `case_mgmt.case_management`, `case_mgmt.client_intakes`
- `core.medical_episodes`, `core.medical_issues`, `core.medical_vitals` (not wired to UI)
- `core.arrest_history` (justice-adjacent but missing consent/provenance contract)
- `core.people_relationships` (person-to-person only; no non-person contacts)
- `portal.appointments`
- Consent tables: `core.person_consents`, `core.person_consent_orgs`, `core.person_consent_requests`

Missing relative to the vision:
- `case_mgmt.encounters`
- `case_mgmt.tasks`
- `core.timeline_events` (projection layer)
- `core.justice_episodes`
- `core.person_characteristics`
- `core.person_relationships` with snapshot contact details for non-person contacts
- Case/org provenance on `case_mgmt.case_management`
- Cross-cutting metadata contract fields on domain tables (owning_org, encounter_id, verification, sensitivity, visibility)

### Gaps vs vision (must be corrected before new work)
- Timeline is activity-feed driven, not a projection layer.
- Encounters and Tasks do not exist as data models.
- Domain records lack consistent provenance, verification, sensitivity, and visibility fields.
- Case model lacks org ownership; people_activities relies on JSON metadata for case context.
- Justice data is not modeled as a structured domain.
- Relationship modeling does not support non-person contacts.

## 1) Non-negotiable constraints
- **No back-compat**: no dual writes, no old table fallbacks, no transitional data shapes. Single cutover.
- **No workarounds or shortcuts**: do it cleanly or do not ship it.
- **Best practices only**: Supabase RLS, Postgres constraints/indexing, Next.js App Router + server actions, audit logging, typed data access.
- **Modular architecture**: domain-scoped data modules and UI components; no ad-hoc SQL in pages.

## 2) Target architecture decisions (hard calls)
- Create **new canonical tables** for Encounters, Tasks, and Timeline Events; retire `core.people_activities` usage.
- Use **domain tables** as source of truth (medical, justice, relationships, characteristics) with a shared metadata contract.
- Treat timeline as a **projection table** populated from domain events, tasks, and system events.
- Enforce consent at the **RLS layer** and in UI with explicit empty states ("why can't I see this?").
- Replace "Visit" naming with **Encounter** everywhere (routes, labels, types) and delete legacy visit entry points.

## 3) Data model plan (Supabase)

### 3.1 Cross-cutting metadata contract
Add to every domain table (or via shared join table if already immutable):
- `person_id` (bigint, FK core.people)
- `case_id` (bigint, nullable, FK case_mgmt.case_management)
- `encounter_id` (uuid/bigint, nullable, FK case_mgmt.encounters)
- `owning_org_id` (bigint, FK core.organizations)
- `recorded_by_profile_id` (uuid, FK portal.profiles)
- `recorded_at` (timestamptz)
- `source` (enum: client_reported | staff_observed | document | partner_org | system)
- `verification_status` (enum: unverified | verified | disputed | stale)
- `sensitivity_level` (enum agreed in Phase 0)
- `visibility_scope` (enum: internal_to_org | shared_via_consent)

### 3.2 New tables
- `case_mgmt.encounters`
  - `id`, `person_id`, `case_id`, `owning_org_id`, `encounter_type`, `started_at`, `ended_at`, `location_context`, `program_context`, `created_by_profile_id`, `created_by_user_id`
  - Indexes: `(person_id, started_at)`, `(owning_org_id, started_at)`

- `case_mgmt.tasks`
  - `id`, `person_id`, `case_id`, `encounter_id`, `owning_org_id`, `assigned_to_profile_id`, `status`, `priority`, `due_at`, `title`, `description`, `source_type`, `source_id`
  - Indexes: `(assigned_to_profile_id, status, due_at)`, `(person_id, status)`

- `core.timeline_events`
  - `id`, `person_id`, `case_id`, `encounter_id`, `owning_org_id`, `event_category`, `event_at`, `source_type`, `source_id`, `visibility_scope`, `sensitivity_level`, `summary`, `metadata`
  - Indexes: `(person_id, event_at desc)`, `(owning_org_id, event_at desc)`

- `core.justice_episodes`
  - Structured justice data aligned with the metadata contract.

- `core.person_relationships`
  - Supports either related person (`related_person_id`) or snapshot contact fields (`name`, `phone`, `email`).
  - Includes safe-contact flags and provenance.

- `core.person_characteristics`
  - Versioned observations with `observed_at`, `observed_by`, `notes`, `visibility_scope`, `verification_status`.

### 3.3 Schema refactors
- Add `owning_org_id` to `case_mgmt.case_management` and backfill from provenance rules.
- Extend `core.medical_episodes` with metadata contract fields; do not create a parallel medical table.
- Replace `core.arrest_history` with `core.justice_episodes` (migrate then drop).
- Replace `core.people.related_person_id` + `core.people_relationships` with the new `core.person_relationships` table (migrate then drop/remove).

### 3.4 RLS + auditing
- Add RLS policies for new tables using existing consent/grant logic (`core.person_consents`, `core.person_access_grants`).
- All writes must go through server actions and call `logAuditEvent`.
- Add SQL tests or verification queries for RLS coverage (no new table ships without explicit policy tests).

## 4) Data migration and cutover (no back-compat)

### 4.1 One-time migrations
- `core.people_activities` -> `core.timeline_events`
  - Map `activity_type` to `event_category`.
  - Pull `case_id` from `metadata.case_id` where present.
  - Set `visibility_scope` from `metadata.client_visible`.
- `core.arrest_history` -> `core.justice_episodes`.
- `core.people_relationships` + `core.people.related_person_id` -> `core.person_relationships`.

### 4.2 Cutover rules
- Remove all reads/writes to `core.people_activities` in code.
- Delete `people_activities`-based RPCs or update them to query `case_mgmt.tasks` and `core.timeline_events`.
- Remove the `/ops/visits/new` route and replace with `/ops/encounters/new`.
- Do not ship any legacy compatibility flags or dual write paths.

## 5) Application changes (by phase)

### Phase 0 - Decision lock + metadata contract
- Lock the enums for `event_category`, `verification_status`, `sensitivity_level`, `visibility_scope`.
- Confirm case ownership model and org provenance rules.
- Define encounter types and task statuses.

### Phase 1 - Encounters + Tasks foundation
- Supabase: create tables + RLS + audit coverage.
- Backend: new modules
  - `src/lib/encounters/*` (queries, actions, validation)
  - `src/lib/tasks/*` (queries, actions, SLA helpers)
  - `src/lib/timeline/*` (projection logic and reads)
- UI: new Encounter flow
  - `/ops/encounters/new`
  - `/ops/encounters/[id]` (workspace: notes, tasks, outputs)
- Replace caseload and inbox logic to read from `case_mgmt.tasks`.

### Phase 2 - Timeline projection + client record refresh
- Replace timeline UI to read `core.timeline_events`.
- Update filters to map to `event_category`.
- Add explicit consent/visibility badges in timeline cards.

### Phase 3 - Medical module
- Extend `core.medical_episodes` to metadata contract.
- Build Medical domain UI in Ops client profile.
- Create encounter-based medical update flow with automatic tasks for follow-ups.

### Phase 4 - Services/Supplies as encounter outputs
- Add `encounter_id` to inventory distributions or service logs.
- Create timeline events from distributions and service deliveries.

### Phase 5 - Justice module
- Create `core.justice_episodes` and UI summary.
- Task generation for court dates or check-ins.

### Phase 6 - Relationships + Characteristics
- Roll out contact/relationship UI based on `core.person_relationships`.
- Add characteristics capture + display with provenance.

## 6) Testing and verification (mandatory)
- Update `src/types/supabase.ts` after migrations.
- Add unit tests for task queries, encounter creation, and timeline filters.
- Add RLS verification queries for each new table.
- Run lint/typecheck/Vitest/Playwright smoke per `docs/architecture/shells.md`.

## 7) Acceptance criteria (temporary plan)
- Encounters and tasks are first-class models; no use of `core.people_activities`.
- Timeline is a projection layer with consent-aware visibility.
- Medical updates can be captured as client-reported and later verified.
- Caseload and inbox are fully task-driven.
- All new tables have explicit RLS policies + audit logging.

## 8) Open decisions to resolve before implementation
Resolved in execution (see Decision log below). Do not proceed without updating this section.

## Decision log (locked for execution)
- `sensitivity_level` taxonomy: `standard`, `sensitive`, `high`, `restricted`.
- Case ownership model: single owning organization per case (`case_mgmt.case_management.owning_org_id`), defaulting to IHARC for existing rows; no shared case ownership in phase 1.
- Justice domain schema: episode model (`core.justice_episodes`) with `episode_type` + structured fields + metadata for extensions.
- Legacy activity type mapping:
  - `visit`, `contact`, `welfare_check`, `incident` -> `encounter`
  - `task`, `follow_up` -> `task`
  - `service_referral` -> `referral`
  - `supply_provision` -> `supply`
  - `appointment` -> `appointment`
  - `note` -> `note`
  - `intake` -> `intake`
  - `client_update` -> `client_update`
  - `consent_contact` -> `consent`
  - default -> `other`
