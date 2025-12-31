# Client Record Inline Editing MVP — Implementation Plan
Last updated: 2025-12-31
Status: In progress

## Goals
- Make all fields shown on the Ops client detail page editable (basic information, contact, situation, and domain records).
- Ensure edits are auditable in a healthcare-style way (single audit event per save, diff-based, optional change reason).
- Support alias corrections via soft delete/edit (aliases are never hard-deleted).
- Keep MVP permissions simple while making it easy to extend into the existing roles/permissions system.

## Non-goals (MVP)
- Full amendment/versioning UI for clinical-grade record corrections.
- Fine-grained field-level permission gates (will follow existing roles/permissions later).
- Database-wide audit triggers (avoid noisy logs in pre-prod).

## Data model changes
- `core.people_aliases`
  - Add `is_active boolean default true not null`
  - Add `deactivated_at timestamptz null`
  - Add `deactivated_by uuid/text null`

## Server actions (MVP)
- `src/lib/client-record/actions.ts`
  - `updatePersonIdentityAction` (basic information)
  - `updatePersonContactAction`
  - `updateSituationAction` (edits latest intake row)
  - `createAliasAction`
  - `updateAliasAction`
  - `setAliasActiveAction` (soft delete/restore)
- Domain update actions
  - `src/lib/medical/actions.ts`: `updateMedicalEpisodeAction`
  - `src/lib/justice/actions.ts`: `updateJusticeEpisodeAction`
  - `src/lib/relationships/actions.ts`: `updateRelationshipAction`
  - `src/lib/characteristics/actions.ts`: `updateCharacteristicAction`

## UI updates
- Replace inline-only cards in `src/app/(ops)/ops/clients/[id]/page.tsx` with client components:
  - `IdentityCard` (basic information + aliases)
  - `ProfileCard` (edit contact)
  - `SituationCard` (edit intake snapshot)
- Update record cards to support editing:
  - `MedicalEpisodesCard`
  - `JusticeEpisodesCard`
  - `RelationshipsCard`
  - `CharacteristicsCard`

## Audit behavior
- Log only when actual changes are detected.
- Include `changed_fields` and optional `change_reason` in audit meta.
- Tag audit meta with `environment` and `is_test` (non-prod filtering).
- Use `logAuditEvent` for all mutations.

## MVP scope decision notes
- Intake corrections update the latest intake row in place for MVP.
- Formal amendment/versioning is deferred but the actions/UX are structured to allow it later.

---

## Progress checklist

### Documentation
- [x] Update client record roadmap with inline editing MVP phase
- [x] Keep this implementation doc updated as progress is made

### Schema + types
- [x] Add soft-delete columns to `core.people_aliases` via migration
- [x] Update `src/types/supabase.ts` + `types/supabase.ts`

### Shared helpers
- [x] Add MVP edit permission helper (`assertCanEditClientRecord`)
- [x] Add client-record enum constants for select/checkbox inputs

### Backend actions
- [x] People record-details update action (audit + diff)
- [x] People contact update action (audit + diff)
- [x] Intake update action (audit + diff)
- [x] Alias create/update/deactivate actions (audit + soft delete)
- [x] Medical update action
- [x] Justice update action
- [x] Relationship update action
- [x] Characteristic update action

### UI (Ops client detail)
- [x] Record card editable + alias management
- [x] Alias add/edit control inline (no slide-out) next to aliases field
- [x] Profile card editable
- [x] Situation card editable
- [x] Medical card edit sheet per record
- [x] Justice card edit sheet per record
- [x] Relationships card edit sheet per record
- [x] Characteristics card edit sheet per record

### QA
- [ ] Verify edit flows save + toast
- [ ] Verify audit logs fire once per edit
- [ ] Verify alias soft delete + restore
