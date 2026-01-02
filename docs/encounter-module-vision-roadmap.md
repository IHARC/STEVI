# STEVI Encounter Module — Vision + Roadmap
Last updated: 2026-01-02  
Status: Living plan (expect frequent edits)

## Why this document exists

Encounters are the primary unit of frontline work in STEVI. If the encounter workflow is confusing, fragmented, or forces staff to guess “which form should I use?”, adoption collapses and the client record becomes inconsistent and low-trust.

This document defines a durable product vision and an implementation roadmap for the **Encounter module** specifically, so we can:

- Keep **one intuitive capture surface** for frontline staff.
- Preserve provenance (who recorded what, when, and under which acting org/program).
- Support robust retrieval and pattern tracking without turning the system into a free-text dumping ground.
- Protect confidentiality (especially around third‑party disclosures).

## Scope

This plan covers the Encounter module surfaces and behaviors in **Ops**:

- Starting and closing encounters (outreach / intake / program / appointment / other).
- The encounter workspace (logging tasks, supplies, domain updates, and observations).
- “Fast entry” capture patterns (quick log) that still produce structured, auditable records.
- Retrieval: how encounter outputs surface in the client profile timeline, task queues, and (later) reporting.
- Confidentiality rules for staff-recorded observations, including third-party disclosures.

## Non-goals (for now)

- Replacing Calls for Service (CFS) dispatch workflows.
- Building a full incident management system inside encounters.
- Offline-first field capture (we can design for it; not implementing it now).
- Clinical-grade charting (STEVI remains “no wrong doors”, not an EMR).

## Where this fits relative to other living plans

- Client record foundation (north star + phased delivery): `docs/client-record-vision-roadmap.md`
- Canon encounter-first scenarios (acceptance ground truth): `docs/Scenarios/Scenarios-1.md`
- Use cases + user stories backlog: `docs/use-cases.md`
- CFS intake/triage/dispatch (public + partner requests): `docs/cfs-implementation-plan.md`
- Incident reports module plan (org-scoped + RLS hardening): `docs/incident-reports-plan.md`

This doc zooms in: *how the Encounter module should feel and behave for end users*.

## Problem statement (what we must avoid)

Common failure modes in outreach tooling:

1) **Too many ways to log the same thing**
   - Staff hesitate, pick inconsistent paths, or stop logging.
2) **Free-text everywhere**
   - Works for “today”, fails for trend tracking and safe retrieval later.
3) **Second-hand info treated like facts**
   - Creates clinical/legal risk and trust damage.
4) **Confidential third‑party disclosures accidentally exposed**
   - Especially via client portals or consent-sharing surfaces.

## Vision (north star)

The Encounter module is the **single primary capture surface** for frontline work:

- Staff start from a **client** and open a **single encounter workspace**.
- Inside that workspace, they can log “outputs” (tasks, supplies, referrals, updates, observations) without leaving context.
- The system distinguishes data quality:
  - `staff_observed` vs `client_reported` vs `document` / `partner_org`.
  - `unverified` by default for second-hand information; verifiable facts can be updated later.
- The system enforces confidentiality:
  - **Third‑party disclosures are never client-visible** in the client portal, even for the subject of the disclosure.

## Guiding principles (how we keep it intuitive and robust)

1) **One primary workflow; many outputs**  
   Users shouldn’t decide between “note vs incident vs lead vs referral” up front. They should record an *output* inside the encounter.

2) **Progressive disclosure**  
   Start with a minimal “what happened” capture. Only ask for deeper structure when it adds downstream value.

3) **Provenance is mandatory**  
   Every encounter output records acting org, recorder, time, and (when relevant) program/location context.

4) **Second-hand info is explicitly labeled**  
   If it’s not directly observed, it is not “truth”; it is a report with source + verification status.

5) **Confidentiality > convenience**  
   Guardrails must exist in UI *and* in the database access layer so future UIs can’t accidentally leak sensitive disclosures.

6) **Tasks are how work happens**  
   Anything that needs follow-up should create a task (with assignee + due date) rather than living as “a note someone might read later”.

## Terminology (mental model)

- **Encounter**: a discrete interaction session (outreach contact, drop-in program interaction, intake appointment).
- **Encounter output**: something recorded *from* an encounter (task, supplies distribution, observation, referral, domain update).
- **Observation**: a recorded statement or situation that may be staff-observed or client-reported and may require follow-up.
- **Third‑party observation**: an observation *about someone other than the current encounter client*, or about an unidentified person.
- **Lead**: an observation about an unidentified person (description + last-seen context) intended to drive a welfare check or outreach follow-up.

## Current implementation snapshot (as of 2026-01-02)

This section is intentionally high-level. For canonical “what exists now” routes and feature inventory, see `docs/app-map.md`.

What exists today in STEVI (high-level):

- Encounter-first entry point and workspace exist (`/ops/encounters/new`, `/ops/encounters/[id]`).
- Encounters support summary/notes and provenance/visibility primitives (exact schema fields may evolve).
- Encounter workspace supports:
  - tasks linked to the encounter,
  - supplies distribution (inventory integration),
  - and surfacing of some domain panels for the encounter’s client.
- The client profile timeline uses `core.timeline_events` as an event layer; encounters project into it.

Key gap:

- There is no first-class “Observation” / “Lead” output model that supports:
  - second-hand attribution + verification,
  - linking to another known person,
  - or tracking an unknown person by description + last seen details.

## Product design: “Observations” as a first-class encounter output

### UX: how staff record observations (fast, consistent)

Inside an encounter, provide a single action: **Add observation**.

The form should be structured around two decisions:

1) **Who is this about?** (Subject)
   - This client (default)
   - Another known person (search & select)
   - A named person (name provided but identity uncertain)
   - An unidentified person (description + last seen)

2) **What kind of observation is it?** (Category)
   - Health concern
   - Safety concern
   - Welfare check / whereabouts
   - Housing / basic needs
   - Relationship / social context
   - Other

Then:
- short summary + details
- `source` (defaults to `staff_observed`; can be `client_reported`)
- `verification_status`:
  - defaults to `unverified` when `source = client_reported`
  - defaults to `unverified` or `verified` depending on org policy when `staff_observed` (recommend `unverified` by default)
- optional “Create follow-up task” (recommended for “welfare check” and “health concern”)

### Confidentiality rules (hard requirements)

Third‑party observations must be treated as confidential disclosures:

- **Never client-visible.** They must not appear in client portal timelines or any client-facing surface.
- **Default staff-only** visibility. Do not offer “Share via consent” on third-party observations.
- **Reporter identity must not be exposed to clients.** (Even the subject of the observation should not see “who said it”.)

Open question (to resolve): whether third‑party observations are shareable across staff in different orgs under consent. See “Open questions”.

### Retrieval: how staff find and use observations later

At minimum:

- In client profile Timeline:
  - show observation entries with clear badges: `client_reported (unverified)` vs `staff_observed`.
  - add a filter for “Observations” (or fold into “Notes” if category labeling is strong).
- In Task queues:
  - tasks created from observations should link back to the originating observation for context.
- In Encounter workspace:
  - show “Observations logged in this encounter” (so the encounter becomes a complete narrative of what happened).

## Data model direction (recommended shape)

### Principle: domain record as source of truth; timeline as projection

Encounters and Tasks already follow the cross-cutting metadata contract (source, verification, sensitivity, visibility). Observations should as well.

Recommended:

1) Add a new domain table, conceptually: `case_mgmt.observations`
   - Records the observation with the full metadata contract.
   - Supports linking to an encounter for provenance.
   - Supports “subject” variants (this client / another known person / named-unlinked / unidentified).

2) Project observations into `core.timeline_events`
   - For staff retrieval and consistent client journey display.
   - Ensure third‑party observations are always projected with `visibility_scope = internal_to_org`.

This keeps the timeline stable and avoids using `timeline_events.metadata` as the true data model.

Alternative (short-term MVP):

- Store observations directly in `core.timeline_events` (`event_category = note`) with structured `metadata`.
- This is faster but risks turning `metadata` into the source of truth and makes later domain workflows harder.

## Roadmap (phased delivery)

### Phase 1 — “Observations” MVP inside encounters (same-subject only)

Goal: allow staff to record staff-observed and client-reported observations about the encounter client, with correct attribution and optional follow-up tasks.

Deliverables:
- Add Observation as an encounter output (single form in encounter workspace).
- `source` + `verification_status` displayed wherever the observation appears.
- “Create follow-up task” integration.

### Phase 2 — Third-party observations (known person + named/unidentified)

Goal: record information that is attributable to another person (or unknown) without treating it as fact, and without leaking it to clients.

Deliverables:
- “Subject = another known person” support.
- “Subject = named but unlinked” support (with later resolution).
- “Subject = unidentified person” support (lead capture with last-seen context).
- Hard enforcement that third-party observations are not client-visible.

### Phase 3 — Promotion paths + de-duplication ergonomics

Goal: turn observations into actionable, durable records without increasing logging burden.

Deliverables:
- “Promote to medical episode / safety incident / referral” flows (role-gated).
- Duplicate detection helpers (e.g., “is this the same unknown person we saw yesterday?”).
- Reporting views for staff: recent leads, overdue welfare checks.

### Phase 4 — Access tiering + cross-org rules (post-pilot)

Goal: allow safe sharing patterns without breaking confidentiality.

Deliverables:
- Sensitivity-level enforcement in RLS (tiered access gates).
- Explicit policies for cross-org sharing of third-party observations (if allowed).
- Audit visibility and redaction-safe summaries.

## Implementation tracking (as of 2026-01-02)

### Phase 1 — Observations MVP (this-client)

- [x] `case_mgmt.observations` domain table with timeline projection.
- [x] Encounter observation capture form (source + verification + sensitivity + visibility).
- [x] Encounter observation list with badges and follow-up task creation.
- [x] Timeline filter + observation badges (source + verification).

### Phase 2 — Third-party observations + leads

- [x] Subject variants: known person, named-unlinked, unidentified lead.
- [x] Third-party confidentiality enforced (internal-only visibility).
- [x] Lead capture fields: description + last-seen context.
- [x] Lead management actions (status updates + resolve to person).

### Phase 3 — Promotions + reporting views

- [x] Promote to medical episode / safety incident / referral (role-gated).
- [x] Promotion audit trail (`observation_promotions`).
- [x] Ops leads view with recent leads + overdue welfare checks.
- [x] Duplicate detection helper (description/location matching).

### Verification (2026-01-02)

- [x] Lint, typecheck, and test suite passing (`eslint`, `tsc --noEmit`, `vitest`).

### Phase 4 — Access tiering (future)

- [ ] Cross-org sharing rules for third-party observations.
- [ ] Sensitivity tier review + redaction-safe summaries.

## Open questions (to resolve before Phase 2)

1) **Cross-org access:** should third-party observations ever be visible to partner org staff, even with consent? If yes, under what permission/scope?
2) **Reporter attribution:** do we store the reporting client identity in a way that is queryable, or do we store only non-identifying provenance references?
3) **Retention policy:** how long do “unidentified person” leads persist before archival?
4) **“Named but unlinked” resolution:** what is the workflow to resolve a described person to a real `core.people` record without accidental mis-linking?
5) **UI language:** what exact labels keep staff accurate and non-stigmatizing (“client reported”, “unverified”, “staff observed”)?
