# STEVI Use Cases + User Stories
Last updated: 2026-01-02  
Status: Living backlog (expect frequent edits)

## Why this document exists

STEVI spans multiple user groups (IHARC staff, partner org staff, volunteers, and clients). Without a single place to capture
end-to-end use cases and user stories, we risk building features that don’t connect into an intuitive workflow or duplicating
data entry paths that become inconsistent over time.

This doc is the canonical “product context” backlog:

- Use cases (end-to-end flows that must work).
- User stories (atomic needs that roll up into use cases).
- Links to the canonical roadmaps, scenarios, and implementation plans.

## How to use this doc (keep it healthy)

- Prefer **links** to canonical scenario/roadmap docs over duplicating full flows here.
- Use **stable IDs** (UC-### / US-###) so PRs can reference them.
- Use cases should describe outcomes + constraints, not UI pixel-perfect designs.

## Use case template

**UC-###: Title**
- **Primary actor(s):** (role + org context)
- **Context / trigger:** what happened that starts the flow
- **Preconditions:** consent/org/permissions assumptions
- **Happy path:** 3–7 bullet steps
- **Variants:** edge cases + alternative flows
- **System outcomes (data):** records created/updated, provenance fields required
- **Confidentiality / sharing:** what must never be shown (client portal, other orgs), and what can be shared
- **Acceptance criteria:** how we know it’s done
- **Related:** links to scenario docs / roadmaps / implementation plans

## User story template

**US-###:** As a `<role>`, I want `<goal>`, so that `<benefit>`.
- **Acceptance criteria:** 2–5 bullets
- **Related:** links to UC(s)

## Canon scenarios (acceptance ground truth)

These are the current canon, end-to-end scenarios used for encounter-first UX acceptance:
- `docs/Scenarios/Scenarios-1.md`

## Use case catalog (working)

### Encounter-first (frontline spine)

**UC-001: Log outreach supplies + client-reported health disclosure (client exists)**  
- Related: `docs/Scenarios/Scenarios-1.md` (Scenario 1), `docs/encounter-module-vision-roadmap.md`

**UC-002: Program encounter → referral to mental health supports (multi-org)**  
- Related: `docs/Scenarios/Scenarios-1.md` (Scenario 2)

**UC-003: “No wrong door” rapid intake for a new person (restricted role)**  
- Related: `docs/Scenarios/Scenarios-1.md` (Scenario 3), `docs/onboarding-contract.md`

**UC-004: Outreach nurse + worker: wound care + vitals + supplies (shared consent)**  
- Related: `docs/Scenarios/Scenarios-1.md` (Scenario 4)

### Observations (second-hand + third-party confidentiality)

**UC-010: Record second-hand health concern about another known client (confidential)**  
- Example: Client A reports Client B has an infected wound.
- Requirements: must be marked `client_reported` + `unverified`, staff-only, never client-visible.
- Related: `docs/encounter-module-vision-roadmap.md` (Observations), `docs/client-record-vision-roadmap.md`

**UC-011: Record “unidentified person” lead (description + last seen) and create welfare-check task**  
- Example: Client reports a new unnamed person sleeping outside; provides description and last-seen location/time.
- Requirements: trackable + de-duplicable over time; staff-only; task-driven follow-up.
- Related: `docs/encounter-module-vision-roadmap.md`

### Calls for Service (intake/triage/dispatch)

**UC-020: Create staff-observed CFS call (location-based, may not be client-linked)**  
- Requirements: org ownership, triage indicators, safe public tracking defaults.
- Related: `docs/cfs-implementation-plan.md`

### Incident reports (org-scoped module)

**UC-030: Create org-scoped incident report with involved parties (known or unknown)**  
- Requirements: no free-text people; org-scoped permissions; RLS hardened before rollout.
- Related: `docs/incident-reports-plan.md`

## User stories (seed list)

**US-010:** As an outreach worker, I want to log what I observed quickly during an encounter, so that the client record stays current.
- Related: UC-001, UC-004

**US-011:** As a frontline staff member, I want to record second-hand information with clear attribution, so that it informs follow-up without being treated as fact.
- Related: UC-010, UC-011

**US-012:** As a case coordinator, I want follow-ups to become tasks, so that nothing critical lives only in notes.
- Related: UC-001, UC-010, UC-011

**US-013:** As a client, I should never see third-party disclosures made by someone else, so that confidentiality is preserved.
- Related: UC-010, UC-011

