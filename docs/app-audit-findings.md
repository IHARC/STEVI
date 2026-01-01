# STEVI App Audit — Findings & Fix Plan (Rewritten)

Date: 2026-01-01

This document replaces all prior audit findings and plans. It focuses on maintainability, modularity, scalability, and auditability for a pre‑production launch. Every finding includes best‑practice rationale, evidence, risks, and required remediation steps. No backward‑compatibility shims or workarounds are allowed.

## Scope & Methodology
- Static review of high‑coupling modules, server actions, and write flows.
- Emphasis on data integrity, auditability, permissions, and notification side effects.
- Verification of modularity and code structure for long‑term scalability.

## Findings

### F‑01: CFS create flow can return failure after a successful create (partial failure)
**Why this is against best practices**
- The system can persist data but return an error to the user, which invites duplicate submissions and inconsistent UI state.
- Partial failures are a common source of “spaghetti” behavior and ambiguous outcomes.

**Evidence**
- `createCfsCallAction` creates the CFS record, logs audit, then returns an error if public tracking upsert fails.
  - `src/app/(ops)/ops/cfs/actions.ts` (create + audit, then error on public tracking)

**Risks/impact**
- Users see a failure but the call exists.
- Duplicated calls and misaligned expectations.

**Fix plan (required steps)**
1. Make CFS create + optional public tracking atomic in a single RPC.
2. Return a single result object containing both call id and tracking id.
3. Log audit after the RPC succeeds (or move audit into the RPC).
4. Update tests to assert: if RPC fails, no audit/notification occurs and no call exists.

**Acceptance criteria**
- CFS creation is atomic with public tracking.
- No action returns an error after creating a call.

---

### F‑02: Notifications can fail actions after DB writes (non‑atomic side effects)
**Why this is against best practices**
- Side‑effect failures should not invalidate successful writes unless explicitly transactional.
- Users should not see errors for work that already succeeded.

**Evidence**
- `maybeNotifyReporter` awaits `queuePortalNotification` without guarding failures, across multiple CFS actions.
  - `src/app/(ops)/ops/cfs/actions.ts`

**Risks/impact**
- Operations succeed but surface as failures.
- Confusing UX and higher support burden.

**Fix plan (required steps)**
1. Move notification enqueueing inside the same RPC transaction where feasible.
2. If not in RPC, treat notification as best‑effort and never throw past the action boundary.
3. Record notification failures in audit/meta for later diagnostics.

**Acceptance criteria**
- Notification failures do not cause action failure when core writes succeed.
- Notification status is auditable.

---

### F‑03: Audit logging is not transactional for critical writes
**Why this is against best practices**
- The system requires every mutation to be auditable; audit failures must not silently skip logging.
- If audit is not transactional, you can end up with a write without its corresponding audit record.

**Evidence**
- `completeAppointment` calls audit logging after RPC success; if audit logging fails, action returns error but DB state is already updated.
  - `src/lib/appointments/actions.ts`

**Risks/impact**
- Compliance/audit gaps and inconsistent state reporting.

**Fix plan (required steps)**
1. Move audit logging for critical writes into DB transactions (RPC or DB triggers) for: appointments, CFS, consent changes, client record edits.
2. Update server actions to rely on transactional audit results and only return success after audit is recorded.
3. Add tests that simulate audit failure and verify the write is rolled back or not applied.

**Acceptance criteria**
- Every critical write is accompanied by an audit entry within the same transaction.
- No write can succeed without audit logging.

---

### F‑04: Inconsistent validation and result shapes remain in client document actions
**Why this is against best practices**
- A consistent validation contract reduces edge‑case bugs and improves maintainability.
- Divergent patterns re‑introduce spaghetti over time.

**Evidence**
- `src/app/(client)/documents/actions.ts` still uses custom `readValue` and bespoke return shape instead of shared action validation.

**Risks/impact**
- Inconsistent UI error handling and inconsistent patterns for future contributors.

**Fix plan (required steps)**
1. Replace custom parsing with `parseFormData` and shared Zod helpers in `src/lib/server-actions/validate.ts`.
2. Return a standardized `ActionResult` shape.
3. Add tests for invalid input handling.

**Acceptance criteria**
- All server actions follow one validation + error contract.

---

### F‑05: CFS actions module remains a high‑coupling “mega‑file”
**Why this is against best practices**
- Large, multi‑concern modules are hard to maintain, test, and safely extend.
- They often accumulate duplicated helpers and subtle inconsistencies.

**Evidence**
- `src/app/(ops)/ops/cfs/actions.ts` is ~1,288 LOC and includes validation, access checks, data writes, notifications, attachments, and timeline updates.

**Risks/impact**
- Higher merge conflicts, harder onboarding, regressions.

**Fix plan (required steps)**
1. Split by feature area:
   - `src/lib/cfs/actions/create.ts`
   - `src/lib/cfs/actions/triage.ts`
   - `src/lib/cfs/actions/dispatch.ts`
   - `src/lib/cfs/actions/sharing.ts`
   - `src/lib/cfs/actions/attachments.ts`
   - `src/lib/cfs/actions/timeline.ts`
2. Keep `src/app/(ops)/ops/cfs/actions.ts` as thin re‑exports only.
3. Centralize shared helpers (notify, payload shaping, validation enums) under `src/lib/cfs/actions/helpers.ts`.
4. Maintain existing action signatures to avoid UI churn, but no legacy fallbacks.

**Acceptance criteria**
- CFS actions are modularized into focused files with minimal duplication.
- The app‑level actions file is small and only re‑exports.

---

## Phased Implementation Plan

### Phase 1 — Data integrity & auditability (must‑fix pre‑launch)
- [ ] F‑01: Make CFS create + public tracking atomic via RPC.
- [ ] F‑03: Make audit logging transactional for critical writes.
- [ ] Add tests for partial‑failure scenarios.

### Phase 2 — Reliability of side effects
- [ ] F‑02: Make notification enqueueing transactional or best‑effort with audit metadata.

### Phase 3 — Consistency and maintainability
- [ ] F‑04: Standardize validation + result shape for client document actions.
- [ ] F‑05: Split CFS actions into modular files.

## Notes for a Fresh Codex Instance
- Start with DB/RPC changes for CFS + audit transactionality; then update server actions.
- Add tests before refactors so behavior is locked.
- Avoid back‑compat shims; remove legacy code when replacing.

## Appendix: High‑Risk Hotspots
- `src/app/(ops)/ops/cfs/actions.ts`
- `src/lib/appointments/actions.ts`
- `src/app/(client)/documents/actions.ts`
