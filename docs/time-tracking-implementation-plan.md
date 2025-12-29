# Time Tracking (Org‑Scoped) — Implementation Plan

Date: 2025-12-29

## 1) Goals and constraints

**Goals**
- Allow staff and volunteers to clock in/out (generic shift tracking) at the **organization level**.
- Admins can view all time cards for their org.
- Integrate with existing costing system.
- Keep historical records accurate when role or wage changes over time.
- Keep the design extensible for future linking to clients/appointments/programs and later approvals.

**Constraints and decisions (confirmed)**
- Volunteers are an **org role** (same model as staff, different permissions).
- Volunteer time should be **$0 cost**.
- Users can have **only one open shift** at any time (no double dipping across orgs).
- No approval workflow now, but do not block adding it later.
- Time is generic clock in/out now, but must support future ties to clients/appointments/programs.

## Implementation status (live)
- [x] Supabase schema: org‑scoped staff time entries, role snapshots, attributions table, enum updates
- [x] Supabase permissions + RLS (org‑scoped) for time tracking + cost event insert policy
- [x] Org role scaffolding: `org_volunteer` template + `role_kind` on roles/templates
- [x] Backend actions + queries (`src/lib/time/*`)
- [x] UI/UX and navigation (`/ops/time`, time tracking nav, feature flag gating)
- [x] Types and tests updated for new access fields and enums
- [x] IHARC org features enabled for testing
- [ ] QA passes (RLS checks, cost events, role switching) — pending manual verification

## 2) Current state audit (high‑level)

**Supabase**
- `core.staff_time_entries` exists with `user_id`, `shift_start`, `shift_end`, `status` (open|closed), optional lat/lng and notes.
- `core.staff_break_entries` exists and links to `staff_time_entries`.
- RLS is **IHARC‑only** (`is_iharc_user()` / `check_iharc_admin_role()`) and not org‑scoped.
- Unique index: **one open shift per user** (`WHERE shift_end IS NULL`).
- Costing exists: `core.cost_events`, `core.cost_categories` (includes `staff_time`), `core.staff_rates` (org‑scoped), etc.
- Volunteer tables exist under `portal.*`, but are **not org‑scoped** and not integrated with time tracking.

**App**
- No current UI or API uses `staff_time_entries`.
- Costing UI and server actions already exist.
- Org feature flags exist (`services_tags`) but no time tracking flag.
- Org‑scoped roles/permissions exist and are used throughout the app.

## 3) Proposed data model changes

### 3.1 Core time tracking tables
Add org‑scoping and historical snapshots to `core.staff_time_entries` so history is stable even if roles/wages change later.

**Add columns**
- `organization_id bigint not null references core.organizations(id)`
- `role_name text not null` — snapshot of org role at clock‑in
- `role_kind text not null default 'staff'` — values: `staff` | `volunteer` (enum recommended)
- `hourly_rate_snapshot numeric(12,2) null` — snapshot at clock‑out (0.00 for volunteers)
- `cost_amount_snapshot numeric(14,2) null` — snapshot at clock‑out
- `currency text not null default 'CAD'`
- `break_minutes integer not null default 0` — optional convenience
- `total_minutes integer not null default 0` — optional convenience
- `cost_event_id uuid null references core.cost_events(id)`
- `source_type text null` — future use: client/appointment/program (or use a dimension table below)
- `source_id text null` — future use
- `metadata jsonb null` — future‑proofing

**Keep**
- Unique constraint: one open shift per user (global) stays **as‑is** to enforce no double dipping.

**Notes**
- Role changes (volunteer → staff, staff → volunteer) do **not** modify prior records because `role_name` and snapshots are stored on the entry (and cost event).
- Wage changes do **not** affect historical cost because `hourly_rate_snapshot` + `cost_amount_snapshot` (and cost_event unit_cost) are stored at close time.

### 3.1b Org roles (volunteer vs staff)
Add `role_kind` to `core.role_templates` + `core.org_roles` and seed an `org_volunteer` template/role per org so volunteers are first‑class org roles.

### 3.2 Optional extension table for future attribution
To avoid schema churn later, add a generic attribution table that can link a time entry to a future target without locking us in now:

`core.staff_time_attributions`
- `id uuid primary key`
- `time_entry_id uuid not null references core.staff_time_entries(id)`
- `organization_id bigint not null references core.organizations(id)`
- `source_type text not null` — e.g., `client`, `appointment`, `program`, `case`, `other`
- `source_id text not null`
- `weight numeric(5,2) null` — optional (for splitting time later)
- `created_at`, `created_by`

This keeps the core time entry simple now while enabling future linking.

### 3.3 Costing integration
On shift close:
- Create a `core.cost_events` row with:
  - `source_type='staff_time'`
  - `cost_category=staff_time`
  - `quantity=hours_worked`
  - `unit_cost=hourly_rate_snapshot`
  - `cost_amount=quantity * unit_cost` (0 for volunteers)
  - `metadata` includes `time_entry_id`, `role_name`, `role_kind`, `break_minutes`, `user_id`
- Store the created `cost_event_id` on the time entry.

This preserves history even if rates change later.

## 4) Permissions + RLS changes

### 4.1 New permissions
Add to `core.permissions`:
- `staff_time.track` — create/update own shifts/breaks
- `staff_time.view_self` — view own shifts
- `staff_time.view_all` — view all shifts for org
- `staff_time.manage` — edit/delete shifts for org (admin)

Org admins can assign these to roles (staff/volunteer) as needed.

### 4.2 RLS policies (org‑scoped)
Replace IHARC‑only policies with org‑scoped ones.

**`core.staff_time_entries`**
- `SELECT` self: `user_id = auth.uid()` AND `organization_id = portal.actor_org_id()`
- `SELECT` org: `has_org_permission(organization_id, 'staff_time.view_all')`
- `INSERT/UPDATE` self: `user_id = auth.uid()` AND `has_org_permission(organization_id, 'staff_time.track')`
- `UPDATE/DELETE` org admin: `has_org_permission(organization_id, 'staff_time.manage')`

**`core.staff_break_entries`**
- Inherit access via the parent time entry (same org and permission checks).

## 5) API / actions design

Introduce a small module (patterned after `src/lib/costs/*`):

- `src/lib/time/actions.ts`
  - `startShift(formData)`
  - `endShift(formData)`
  - `startBreak(timeEntryId)`
  - `endBreak(breakId)`

- `src/lib/time/queries.ts`
  - `fetchMyOpenShift()`
  - `fetchMyShifts(dateRange)`
  - `fetchOrgShifts(orgId, filters)`

**Behavior**
- `startShift` checks for an existing open shift for the user (enforced by unique index too).
- `endShift` computes total minutes and break minutes, closes the shift, and creates a cost event.
- `role_name` + `role_kind` captured at clock‑in; `hourly_rate_snapshot` captured at close.

## 6) UI/UX plan

### 6.1 Navigation
- Add org feature flag `time_tracking` in `ORG_FEATURE_OPTIONS`.
- Add nav entry under Ops Frontline: `/ops/time` (visible if feature enabled + permission).

### 6.2 My Time (staff + volunteers)
- **Primary card:**
  - Start shift (dropdown for role_name if user has multiple org roles)
  - Live timer when open
  - Break start/stop
  - End shift (notes + confirm)
- **History list:**
  - Today/This week
  - Status chips + duration
  - Cost display for staff; “Volunteer ($0)” badge for volunteers

### 6.3 Team Timecards (admins)
- Filters: date range, role, status, staff vs volunteer
- Table columns: person, role, start/end, break minutes, net hours, cost
- Row detail: notes, location, cost event link
- Export CSV (optional)

## 7) Costing behavior (historical accuracy)

- Cost values are **snapshotted** at shift close.
- Volunteer entries create cost events with unit_cost=0 and cost_amount=0.
- Role or wage changes do **not** retroactively affect existing time entries or cost events.

## 8) Approval workflow (future‑proof)

Not implemented now, but keep it easy to add later by:
- Keeping `status` extensible (today: `open` | `closed`); later add `submitted` | `approved` | `rejected`.
- Storing cost_event_id so you can delay cost event creation until approval if desired.
- Optional future table `staff_time_reviews` with `reviewed_by`, `reviewed_at`, `status`, `notes`.

## 9) Migration plan (Supabase)

**Step 1 — Schema**
- Add columns + enums for `role_kind`.
- Add `organization_id` to `staff_time_entries` and backfill with IHARC org for old entries.
- Add `cost_event_id` + snapshots.
- Add optional `staff_time_attributions` table.

**Step 2 — Indexes**
- Keep existing unique open‑shift index (`user_id WHERE shift_end IS NULL`).
- Add indexes:
  - `(organization_id, shift_start desc)`
  - `(organization_id, role_kind, shift_start desc)`

**Step 3 — Permissions + RLS**
- Insert new permissions.
- Create policies as above.
- Remove or disable IHARC‑only policies on these tables.

**Step 4 — Backfill**
- Set `role_kind = 'staff'` for existing entries.
- Set `role_name` to a default (e.g., `iharc_staff`) if missing.
- Set `hourly_rate_snapshot` and `cost_amount_snapshot` if back‑calculable, else leave null.

## 10) Testing and QA

- RLS tests: self‑only vs org‑admin access.
- Ensure one open shift per user is enforced.
- Cost event correctness: durations, breaks, 0 cost for volunteers.
- Rate change scenario: new shifts use new rate; old cost events unchanged.

## 11) Rollout plan

- Ship migrations + RLS first (behind feature flag).
- Enable feature per org.
- Add UI + actions.
- Monitor cost reports for staff_time category (should include volunteer entries with $0 if desired).

---

## Open items to confirm before build

1) Default `role_name` for clock‑in if user has multiple org roles.
2) Whether volunteer time should appear in cost reports (as $0) or be filtered out.
3) Whether shift edit/delete is allowed for admins only or for staff on their own records.
4) If location (lat/lng) is required or optional for shift start/end.
