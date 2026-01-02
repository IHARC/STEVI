# STEVI Docs Index
Last updated: 2026-01-02  
Status: Working index (expect frequent edits)

## How to use these docs (avoid staleness)

- Prefer **one canonical doc per topic**. Other docs may mention the topic, but should link back instead of restating details.
- Use naming conventions to signal intent:
  - `*-vision-roadmap.md`: living product direction (what/why, phased roadmap, open questions).
  - `*-implementation-plan.md`: tactical delivery plan (how, sequencing, blockers, checklist).
  - `*-audit-findings.md`: security/quality findings + remediation notes.
- Keep `Last updated` current on living docs; if a section becomes stale, delete it and link to the canon.

## Where to start (by question)

- “What exists right now?” → `docs/app-map.md`
- “What are we building toward?” → `docs/client-record-vision-roadmap.md` (umbrella) + module roadmaps (below)
- “What flows must work end-to-end?” → `docs/Scenarios/README.md`
- “What are our user stories/use cases?” → `docs/use-cases.md`
- “How should this feature be built safely?” → relevant implementation plan (CFS, incidents, consent, time tracking)

## When adding a feature (docs checklist)

- Add/adjust user stories and use cases in `docs/use-cases.md` (use stable IDs).
- If it changes an end-to-end flow, update or add a canon scenario under `docs/Scenarios/` and keep the index current.
- If it changes product direction, update the relevant `*-vision-roadmap.md` (or add a new module roadmap and link it here).
- If it’s a delivery plan with blockers/checklists, update/add a `*-implementation-plan.md`.
- If it adds/changes routes or hubs, update `docs/app-map.md` (treat routes as canon there).
- Update `Last updated` on any living docs you touch.

## Living roadmaps (canonical product direction)

- Client record foundation (umbrella): `docs/client-record-vision-roadmap.md`
- Encounter module (encounter-first UX details): `docs/encounter-module-vision-roadmap.md`
- Costing vision: `docs/costing-vision-plan.md`

## Canon scenarios (acceptance ground truth)

- Scenarios index: `docs/Scenarios/README.md`
- Encounter-first scenarios: `docs/Scenarios/Scenarios-1.md`

## Implementation plans (tactical delivery)

- CFS dispatch + tracking: `docs/cfs-implementation-plan.md`
- Incident reports module (org-scoped + RLS hardening): `docs/incident-reports-plan.md`
- Consent system: `docs/consent-system-plan.md`
- Assisted onboarding + consent capture: `docs/onboarding-contract.md`, `docs/onboarding-consent-plan.md`
- Time tracking: `docs/time-tracking-implementation-plan.md`
- Inline editing MVP (client record): `docs/client-record-inline-editing-mvp.md`
- Supabase OAuth login: `docs/supabase-oauth-login-plan.md`

## Architecture + backend reference

- Backend overview: `docs/backend.md`
- Architecture notes: `docs/architecture/`
- App map (routes + feature inventory): `docs/app-map.md`

## Standards (UI + patterns)

- UI standards: `docs/ui-standards.md`
- Design tokens: `docs/design-tokens.md`
- List pattern: `docs/list-pattern.md`
- Navigation ownership: `docs/navigation-ownership.md`

## Audits / findings

- App audit findings: `docs/app-audit-findings.md`
