# STEVI App Audit — Findings & Fix Plan

Date: 2025-12-31

This document records an app-wide audit focusing on spaghetti-code risks, anti-patterns, and architectural debt that could reduce maintainability, modularity, or scalability prior to launch. Each finding includes why it is against best practices, concrete evidence locations, and step-by-step remediation guidance suitable for a new Codex instance to implement.

## Scope & Methodology
- Static review of the largest files and highest coupling areas.
- Focused on server actions, permissions/auth, and large page components.
- Reviewed existing lint/testing setup and documentation to understand intended architecture.

Key context:
- Next.js 16 App Router, React 19, Supabase backend.
- Server actions are used heavily for write flows.
- App has explicit audit logging and permissions.

## Findings

### F-01: Missing RPC error handling in CFS server actions (data consistency risk)
**Why this is against best practices**
- Every RPC/network call can fail; ignoring `error` means side effects (audit logs, notifications, UI success states) can happen even when DB writes fail.
- This creates inconsistent state and user-facing “success” that never actually persisted.

**Evidence**
- `src/app/(ops)/ops/cfs/actions.ts`: multiple `rpc(...)` calls are awaited without checking `{ error }`.
  - `triageCfsAction` (`cfs_triage`) around line ~354.
  - `verifyCfsAction` (`cfs_verify`) around line ~405.
  - `dismissCfsAction` (`cfs_dismiss`) around line ~451.
  - `markDuplicateCfsAction` (`cfs_mark_duplicate`) around line ~497.
  - Also `shareCfsWithOrgAction`, `transferCfsOwnershipAction`, etc.

**Risks/impact**
- Audit logs can record actions that never happened.
- Notifications can be sent for operations that failed.
- CFS queues and statuses can drift from what users believe happened.

**Fix plan (required steps)**
1. For each `rpc` call, destructure and check `error`:
   - Example pattern:
     ```ts
     const { error } = await supabase.schema('case_mgmt').rpc('cfs_triage', { ... });
     if (error) throw error;
     ```
2. Wrap post-RPC actions (audit + notifications + revalidation) behind the error check.
3. Standardize an internal helper to reduce repetition, e.g. `assertRpcOk(name, result)` or `checkSupabaseError(result)` in `src/lib/supabase/guards.ts`.
4. Add a unit test or integration test for at least one CFS action that simulates RPC failure and asserts no audit/notification call occurs.

**Acceptance criteria**
- Every RPC call in `src/app/(ops)/ops/cfs/actions.ts` checks `error` and throws or returns a failure state before any follow‑up side effects.
- Tests include at least one negative case for a CFS action.

---

### F-02: `loadPortalAccess` is a “god function” with hidden writes and mixed concerns
**Why this is against best practices**
- The function loads auth, mutates profile data, queries orgs, resolves permissions, and builds menu links.
- Hidden writes inside what should be a pure “read access context” API leads to unexpected DB writes when called from server components or caching layers.
- It couples auth/session state with UI concerns (navigation), making it harder to test or reuse in non‑UI contexts.

**Evidence**
- `src/lib/portal-access.ts`:
  - Performs profile updates/auto‑selection of organization (`profiles.update`) inside the access loader (around lines ~124–158).
  - Also fetches org features, permissions, and later builds menu items (`buildPortalNav` dependency). 

**Risks/impact**
- Non‑idempotent side effects every time a request loads access.
- Hard to reason about permissions vs. UI behavior because they are tightly coupled.
- Increased likelihood of circular dependencies or indirect UI bugs.

**Fix plan (required steps)**
1. Split `loadPortalAccess` into smaller, pure functions:
   - `resolveUserProfile(supabase, userId)`
   - `resolvePermissions(supabase, profile, orgId)`
   - `resolveOrganizationContext(supabase, accessContext)`
   - `buildAccessSummary(...)`
2. Move the auto‑select organization logic into a separate, explicit action (e.g., `selectActingOrgAction`) or guard with a flag:
   - `loadPortalAccess({ allowSideEffects: false })` should be the default used in RSC and queries.
3. Introduce a typed `AccessContext` object that contains only auth + permission info; keep nav building separate in `portal-navigation` or a new `portal-ui-access.ts`.
4. Update call sites:
   - Server actions can call `loadPortalAccess({ allowSideEffects: true })` when needed.
   - UI/server components should call the pure variant.
5. Add tests in `src/lib/portal-access.test.ts` to validate no writes happen in the pure path.

**Acceptance criteria**
- `loadPortalAccess` (or replacement) can run without any DB writes by default.
- Navigation building does not depend on a function that mutates data.

---

### F-03: Multi‑step actions are not transactional (partial failure risk)
**Why this is against best practices**
- Multi‑step write flows should be atomic. If step 1 succeeds and step 2 fails, the system is left in a partially updated state.
- PostgREST doesn’t provide client‑side transactions; this must be done via RPC functions or stored procedures.

**Evidence**
- `src/lib/appointments/actions.ts`:
  - `completeAppointment` updates the appointment, then inserts cost events. If cost creation fails, the appointment remains completed while returning an error (lines ~467+).
- Similar patterns exist in other actions (e.g., onboarding + consent + audit sequences).

**Risks/impact**
- Data integrity issues (completed appointments without costs).
- Users may retry and create duplicated records or confusing outcomes.

**Fix plan (required steps)**
1. Create a Supabase RPC function (Postgres function) that performs the multi‑step sequence in a single transaction (e.g., `complete_appointment_with_costs`).
2. Update the action to call the RPC and check `error` (see F‑01 pattern).
3. Ensure the RPC returns the IDs needed for audit logging so the action can log only after success.
4. Add tests for success and failure (with forced RPC failure in test environment).

**Acceptance criteria**
- `completeAppointment` uses a single RPC to update appointment + cost event atomically.
- No action returns an error after making partial DB changes.

---

### F-04: Inconsistent input validation and error shaping across server actions
**Why this is against best practices**
- Mixed parsing styles (`getString` helper vs raw `formData.get` vs custom functions) leads to inconsistent behavior and errors.
- This increases bug risk and makes validation hard to reason about or reuse.

**Evidence**
- `src/app/(ops)/ops/cfs/actions.ts` uses `getString/getNumber` helpers.
- `src/lib/appointments/actions.ts` uses custom `readString` and `parseDateTime`.
- `src/lib/cases/actions.ts` parses from `formData.get` directly and throws errors.

**Risks/impact**
- Error messages vary and are not normalized for UI.
- Edge‑case input failures can differ between forms with identical data.

**Fix plan (required steps)**
1. Standardize on a single validation approach (recommended: Zod schemas).
2. Create shared validation utilities in `src/lib/server-actions/validate.ts`.
3. Update server actions to:
   - Parse `FormData` into a plain object.
   - Validate via schema and return normalized error shape.
4. Define a standard error contract for server actions, e.g.
   ```ts
   type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
   ```
5. Add tests for a representative action to confirm behavior on invalid input.

**Acceptance criteria**
- All server actions in `src/lib/appointments/actions.ts`, `src/lib/cases/actions.ts`, and `src/app/(ops)/ops/cfs/actions.ts` use the same validation utility and return a consistent result shape.

---

### F-05: “Fat” page components mix fetching, permission logic, and UI
**Why this is against best practices**
- Large page components are difficult to test and refactor; they also increase risk of regressions when UI and logic change together.
- This is a classic “spaghetti” symptom: too many responsibilities in one module.

**Evidence**
- `src/app/(ops)/ops/organizations/[id]/page.tsx` (≈900+ LOC): permissions, multiple fetches, formatting, UI.
- `src/app/(ops)/ops/clients/[id]/page.tsx` (≈660+ LOC): access checks, query param parsing, multiple data sources, view‑model prep, UI rendering.

**Risks/impact**
- Higher merge conflicts, harder onboarding, brittle behavior.

**Fix plan (required steps)**
1. Extract data loading into dedicated loader modules:
   - `src/lib/organizations/loaders.ts`
   - `src/lib/client-record/loaders.ts`
2. Create view‑model builders that accept loaded data and return a UI‑ready object.
3. Make page components purely compose view model + UI.
4. Move formatting helpers (date formatting, label mapping) into shared `lib/formatters`.

**Acceptance criteria**
- Page components no longer contain raw Supabase queries or access logic; those live in `lib/.../loaders.ts`.

---

### F-06: Duplicate Supabase type definitions
**Why this is against best practices**
- Two generated type files can drift and cause subtle mismatches.
- Unclear source of truth makes future updates risky.

**Evidence**
- `types/supabase.ts`
- `src/types/supabase.ts` (this is the one referenced in code)

**Risks/impact**
- Divergent types, hidden errors in queries or migrations.

**Fix plan (required steps)**
1. Decide on a single source of truth (recommend `src/types/supabase.ts`).
2. Remove the duplicate file or make one re‑export the other.
3. Update any references if needed (currently most imports use `@/types/supabase`).

**Acceptance criteria**
- Only one authoritative Supabase types file remains and all imports point to it.

---

### F-07: Large UI components with duplicated form logic
**Why this is against best practices**
- Repeated form structure increases drift and introduces subtle inconsistencies.
- Makes changes harder across multiple dialogs.

**Evidence**
- `src/components/workspace/admin/inventory/items/StockDialogs.tsx`: repeated setup/reset, repeated fields per dialog.

**Risks/impact**
- Bugs surface when one form is updated but others are not.

**Fix plan (required steps)**
1. Extract a shared form schema and base form component.
2. Implement reusable form sections (location selector, cost fields, notes).
3. Use composition to pass dialog‑specific defaults and submit handlers.

**Acceptance criteria**
- `StockDialogs.tsx` reduced to composition of shared components with minimal duplication.

---

### F-08: Navigation config is large and tightly coupled to access model
**Why this is against best practices**
- Large static config with inline permission rules is hard to change and test.
- Coupling to `PortalAccess` locks navigation to current permission architecture.

**Evidence**
- `src/lib/portal-navigation.ts` defines hundreds of items and inline rule lambdas.

**Risks/impact**
- Slow evolution of navigation and higher regression risk.

**Fix plan (required steps)**
1. Extract navigation config to data‑only objects (JSON/TS data) plus a separate rule resolver.
2. Introduce unit tests to assert nav visibility for representative roles.
3. Optionally generate nav from a declarative schema that can be used by ops/admin tooling.

**Acceptance criteria**
- Navigation rules are separated from nav data, with tests covering top‑level sections.

---

## Phased Implementation Plan

### Phase 1 — Data integrity & correctness (must‑fix pre‑launch)
- [x] F-01: Add RPC error handling in CFS actions. (Updated 2025-12-31)
- [x] F-03: Make `completeAppointment` and other multi‑step writes transactional via RPC. (Updated 2025-12-31)
- [x] Add at least one failing test case for each critical action. (Updated 2025-12-31)

### Phase 2 — Access & validation hardening
- [x] F-02: Split `loadPortalAccess` into pure + side‑effect variants. (Updated 2025-12-31)
- [x] F-04: Standardize server‑action validation + error shape. (Updated 2025-12-31)

### Phase 3 — Maintainability refactors
- [x] F-05: Break up fat pages into loaders and view models. (Updated 2025-12-31)
- [x] F-06: Remove duplicate Supabase types. (Updated 2025-12-31)
- [x] F-07: Deduplicate inventory dialog forms. (Updated 2025-12-31)
- [x] F-08: Refactor navigation config & add tests. (Updated 2025-12-31)
- [x] Align server-action validation helpers with Zod v4 and update callers. (Updated 2025-12-31)
- [x] Resolve post-refactor typecheck regressions (actions, ops pages, inventory dialogs, RPCs). (Updated 2025-12-31)

## Notes for a Fresh Codex Instance
- Start with `src/app/(ops)/ops/cfs/actions.ts` to implement F‑01; each `rpc` call should check `error` before audit/notify.
- For F‑03, add a Postgres function in Supabase (name suggestion: `complete_appointment_with_costs`) and update `completeAppointment` to call it.
- For F‑02, create a new file `src/lib/portal-access/` folder with smaller functions; keep `loadPortalAccess` as a thin orchestration layer.
- Follow existing lint patterns and update tests in `src/lib/portal-access.test.ts` or add new ones as needed.

## Appendix: High‑Risk Hotspots (by size)
- `src/app/(ops)/ops/cfs/actions.ts`
- `src/app/(ops)/ops/organizations/[id]/page.tsx`
- `src/app/(ops)/ops/clients/[id]/page.tsx`
- `src/lib/appointments/actions.ts`
- `src/lib/cases/actions.ts`
- `src/lib/consents/service.ts`
- `src/lib/admin-users.ts`
