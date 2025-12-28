# Costing & Reporting Vision Plan (STEVI)

**Purpose**
- Provide an implementation plan for running costs at the client level and metadata/org level.
- Provide enough context so a new Codex agent can understand **what**, **where**, and **why** in this codebase.
- Include scenarios, examples, and technical details to remove ambiguity.

---

## 0) High-Level Summary
STEVI already captures activities (services), inventory distributions (supplies), and org membership/consent. This plan introduces a **cost ledger** (single source of truth for cost events) and a **dimension system** (programs, funding, outreach type, etc.) so costs can be aggregated by client, org, time, and metadata. Costs must respect consent and RLS; cross‑org totals should only show when allowed.

Primary goals:
- **Client-level running total** across services, supplies, staff time, referrals from all orgs using the app.
- **Org-level reporting** for funding/grants, public education, and internal budgeting.
- **Traceability** from cost totals down to the underlying event.

---

## 1) Current State in STEVI (Anchors for Implementation)

### 1.1 Activity / Outreach logging
- `core.people_activities` is the canonical activity log for clients.
- Used by outreach logging in `/src/lib/staff/actions.ts`.
- Fields include `person_id`, `activity_type`, `provider_org_id`, `provider_profile_id`, `metadata`.

### 1.2 Inventory / Supplies
- Inventory tracking is built:
  - `inventory.items.cost_per_unit`
  - `inventory.inventory_transactions.unit_cost`
  - `inventory.distributions` + `inventory.distribution_items.unit_cost`
- Distribution records can reference `person_id`.

### 1.3 Donations / Catalog
- `donations.catalog_items.unit_cost_cents` and distribution metrics can be used as fallback pricing.

### 1.4 Org permissions + consent
- RBAC tables exist (`core.permissions`, `core.role_templates`, org roles).
- Consent system exists (`core.person_consents`, `core.person_access_grants`).
- RLS enforcement for person data already exists and must be reused for cost events.

### 1.5 Feature flags
- Org feature flags are stored in `core.organizations.services_tags` and managed via `/src/lib/organizations.ts`.

---

## 2) Target Data Model (Exact DDL)

### 2.1 Enums
```sql
create type core.cost_source_type_enum as enum (
  'activity',
  'distribution',
  'inventory_tx',
  'appointment',
  'manual',
  'external'
);

create type core.cost_entry_type_enum as enum (
  'direct',
  'replacement_value',
  'overhead'
);
```

### 2.2 Core cost tables
```sql
create table core.cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create table core.cost_events (
  id uuid primary key default gen_random_uuid(),
  person_id bigint null references core.people(id) on delete set null,
  organization_id bigint not null references core.organizations(id) on delete restrict,
  source_type core.cost_source_type_enum not null,
  source_id text null,
  occurred_at timestamptz not null,
  cost_amount numeric(14,2) not null,
  currency text not null default 'CAD',
  quantity numeric(12,3) null,
  unit_cost numeric(12,4) null,
  uom text null,
  cost_category_id uuid null references core.cost_categories(id) on delete set null,
  entry_type core.cost_entry_type_enum not null default 'direct',
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create index cost_events_person_id_idx on core.cost_events (person_id);
create index cost_events_org_id_idx on core.cost_events (organization_id);
create index cost_events_occurred_at_idx on core.cost_events (occurred_at);
create index cost_events_category_idx on core.cost_events (cost_category_id);
create index cost_events_source_idx on core.cost_events (source_type, source_id);
```

### 2.3 Dimensions
```sql
create table core.cost_dimensions (
  id uuid primary key default gen_random_uuid(),
  dimension_type text not null,
  name text not null,
  description text null,
  created_at timestamptz not null default now()
);

create unique index cost_dimensions_unique on core.cost_dimensions (dimension_type, name);

create table core.cost_event_dimensions (
  cost_event_id uuid not null references core.cost_events(id) on delete cascade,
  dimension_id uuid not null references core.cost_dimensions(id) on delete cascade,
  primary key (cost_event_id, dimension_id)
);
```

### 2.4 Rates + Service Catalog
```sql
create table core.staff_rates (
  id uuid primary key default gen_random_uuid(),
  org_id bigint not null references core.organizations(id) on delete cascade,
  role_name text not null,
  hourly_rate numeric(12,2) not null,
  effective_from date not null default current_date,
  effective_to date null,
  created_at timestamptz not null default now()
);

create index staff_rates_org_role_idx on core.staff_rates (org_id, role_name, effective_from);

create table core.service_catalog (
  id uuid primary key default gen_random_uuid(),
  service_code text not null unique,
  label text not null,
  unit_cost numeric(12,2) not null,
  unit_type text not null,
  default_category_id uuid null references core.cost_categories(id) on delete set null,
  created_at timestamptz not null default now()
);
```

---

## 3) Field Contracts (What to add to existing flows)

### 3.1 `core.people_activities.metadata`
Add standard keys used by cost generation:
- `duration_minutes` (number)
- `service_code` (string, matches `core.service_catalog.service_code`)
- `units` (number, for unit-based services)
- `cost_override` (number, optional)
- `cost_category` (string, optional)
- `uom` (string, optional)

### 3.2 Inventory distribution payloads
- Ensure distribution item inputs accept `unit_cost` if known.
- If `unit_cost` not passed, system must fall back:
  - `inventory.distribution_items.unit_cost` -> `inventory.items.cost_per_unit` -> `donations.catalog_items.unit_cost_cents`.

### 3.3 Appointments
- On completion of appointment, capture `duration_minutes` and the staff role used for rate lookup.

---

## 4) Cost Event Generation (Triggers or Server Actions)

### 4.1 Suggested approach
- Use **DB triggers** for inventory distributions (deterministic and source‑of‑truth in DB).
- Use **server actions** for outreach logging + appointments (keeps logic in app layer for user context).

### 4.2 Example trigger for inventory distribution
```sql
create or replace function core.fn_create_cost_event_from_distribution()
returns trigger as $$
begin
  -- Assumes NEW is a distribution_item row
  insert into core.cost_events (
    person_id,
    organization_id,
    source_type,
    source_id,
    occurred_at,
    cost_amount,
    currency,
    quantity,
    unit_cost,
    uom,
    cost_category_id,
    metadata
  )
  select
    d.person_id,
    coalesce(d.provider_org_id, it.provider_organization_id),
    'distribution',
    NEW.id::text,
    d.created_at,
    (NEW.qty * coalesce(NEW.unit_cost, i.cost_per_unit))::numeric(14,2),
    'CAD',
    NEW.qty,
    coalesce(NEW.unit_cost, i.cost_per_unit),
    i.unit_type,
    (select id from core.cost_categories where name = 'supplies'),
    jsonb_build_object('distribution_id', NEW.distribution_id, 'item_id', NEW.item_id)
  from inventory.distributions d
  join inventory.items i on i.id = NEW.item_id
  left join inventory.inventory_transactions it on it.ref_id = NEW.distribution_id
  where d.id = NEW.distribution_id;
  return NEW;
end;
$$ language plpgsql;

create trigger distribution_item_cost_event
after insert on inventory.distribution_items
for each row execute function core.fn_create_cost_event_from_distribution();
```

### 4.3 Outreach logging (server action)
- After writing to `core.people_activities`, compute cost event if metadata contains duration/service.
- Use `core.staff_rates` or `core.service_catalog` for cost lookup.

Pseudo-logic:
- If `metadata.cost_override` exists, use it.
- Else if `metadata.duration_minutes` exists -> lookup staff rate -> cost = minutes/60 * hourly_rate.
- Else if `metadata.service_code` exists -> lookup service catalog -> cost = units * unit_cost.
- Insert `core.cost_events`.

### 4.4 Appointments
- On completion, generate cost event using staff rates.

---

## 5) RLS & Permissions (Concrete Policies)

### 5.1 New permissions
- `cost.view`
- `cost.manage`
- `cost.report`
- `cost.admin`

### 5.2 RLS on `core.cost_events`
```sql
alter table core.cost_events enable row level security;

create policy cost_events_select_policy on core.cost_events
  for select
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and public.has_permission_single('cost.view')
    )
    or (
      person_id is not null and
      exists (
        select 1
        from core.person_access_grants g
        where g.person_id = cost_events.person_id
          and (
            g.grantee_user_id = auth.uid()
            or (g.grantee_org_id is not null and core.is_org_member(g.grantee_org_id, auth.uid()))
          )
          and (g.expires_at is null or g.expires_at > now())
          and (
            (g.grantee_user_id = auth.uid() and portal.actor_org_id() is null)
            or core.fn_person_consent_allows_org(cost_events.person_id, portal.actor_org_id())
          )
      )
    )
  );

create policy cost_events_insert_policy on core.cost_events
  for insert
  with check (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );

create policy cost_events_update_policy on core.cost_events
  for update
  using (
    core.is_global_admin()
    or is_iharc_user()
    or (
      organization_id = portal.actor_org_id()
      and public.has_permission_single('cost.manage')
    )
  );
```

### 5.3 RLS on dimensions + categories
- Restrict to admin/manage roles.

---

## 6) Reporting & Rollups (Exact Views)

### 6.1 Daily aggregation
```sql
create materialized view analytics.cost_event_daily as
select
  date_trunc('day', occurred_at)::date as day,
  organization_id,
  person_id,
  cost_category_id,
  sum(cost_amount) as total_cost,
  count(*) as event_count
from core.cost_events
group by 1,2,3,4;

create index cost_event_daily_idx on analytics.cost_event_daily (day, organization_id, person_id);
```

### 6.2 Person rollups
```sql
create materialized view analytics.person_cost_rollups as
select
  person_id,
  organization_id,
  sum(cost_amount) as total_cost,
  sum(case when occurred_at >= now() - interval '30 days' then cost_amount else 0 end) as cost_30d,
  sum(case when occurred_at >= now() - interval '90 days' then cost_amount else 0 end) as cost_90d,
  sum(case when occurred_at >= now() - interval '365 days' then cost_amount else 0 end) as cost_365d
from core.cost_events
where person_id is not null
group by 1,2;
```

### 6.3 Org rollups
```sql
create materialized view analytics.org_cost_rollups as
select
  organization_id,
  cost_category_id,
  sum(cost_amount) as total_cost,
  sum(case when occurred_at >= now() - interval '30 days' then cost_amount else 0 end) as cost_30d,
  sum(case when occurred_at >= now() - interval '365 days' then cost_amount else 0 end) as cost_365d
from core.cost_events
group by 1,2;
```

### 6.4 Refresh strategy
- Refresh nightly via scheduled job.
- For admin dashboards, allow “Refresh now” button to run `refresh materialized view`.

---

## 7) UI/UX Implementation Map (Concrete Routes + Files)

### 7.1 Client view
- Route: `/ops/clients/[id]?view=costs`
- File: `/src/app/(ops)/ops/clients/[id]/page.tsx`
- Components to add:
  - `CostSnapshotCard`
  - `CostTimelineTable`

### 7.2 Org cost dashboard
- Route: `/ops/reports/costs`
- File: `/src/app/(ops)/ops/reports/costs/page.tsx`
- Components:
  - `OrgCostSummary` chart
  - `CostBreakdownByCategory` table

### 7.3 Org settings
- Route: `/ops/organizations/[id]?tab=costs`
- File: `/src/app/(ops)/ops/organizations/[id]/page.tsx`
- Add tab: “Costs”
- Subsections:
  - Staff rate table
  - Service catalog manager
  - Cost dimension manager

### 7.4 Nav gating
- Add to `portal-navigation.ts`:
  - New “Reports” group or “Costs” hub.
  - Gate with `access.canViewMetrics` OR new permission `cost.report`.

---

## 8) Scenarios & Examples

### Scenario 1 — Supplies
- 10 hand warmers distributed to Client A.
- unit_cost = 1.50.
- Cost event: $15.00, category = supplies, source = distribution.

### Scenario 2 — Staff time
- Outreach contact, 45 minutes.
- Staff rate $40/hr.
- Cost event: $30.00, category = staff_time, source = activity.

### Scenario 3 — Multi‑org
- Org A supplies, Org B staff time.
- Client consent allows cross‑org; totals show combined cost.

### Scenario 4 — Group distribution
- Supplies given to 8 people, only 3 identified.
- 3 person‑linked events + 1 org-only cost event.

### Scenario 5 — Housing vs street survival
- Use reports to compare cost of ongoing outreach + supplies vs supportive housing placement.

---

## 9) Backfill Plan

### Step 1
- Insert `cost_categories` seed data.

### Step 2
- Backfill distributions:
```sql
insert into core.cost_events (...)
select ... from inventory.distribution_items join inventory.distributions ...;
```

### Step 3
- Backfill outreach activities:
  - Only for those with metadata containing duration/service.

### Step 4
- Validate totals with sampling (compare distributions vs cost_events totals).

---

## 10) Testing & Verification

### RLS validation
- Org user without `cost.view` cannot read cost events.
- Org user with `cost.view` only sees org costs + consented client costs.
- IHARC admin sees all.

### Data integrity
- Distribution insert -> cost_events insert.
- Outreach activity with duration -> cost event insert.
- Deleting distribution should not delete cost event unless explicitly desired.

### UI
- Cost snapshot loads for clients with any cost events.
- Org dashboard aggregates match rollup totals.

---

## 11) Acceptance Criteria
- Client page shows running total (lifetime + last 30/90/365 days).
- Org dashboard shows totals by category and over time.
- Cross‑org totals are only visible with consent.
- All cost events trace back to source via `source_type` + `source_id`.

---

## 12) Open Questions
- Staff time: actual time logged vs standardized units?
- Donated goods: replacement value vs actual spend?
- Visibility defaults for frontline users?
- Minimum consent requirement for cross-org totals?

---

## 13) Reference Pointers (for new agent)
- Outreach logging action: `/src/lib/staff/actions.ts`
- Activity table: `/src/types/supabase.ts` (`core.people_activities`)
- Inventory: `/src/lib/inventory/*`, `inventory.distributions`, `inventory.distribution_items`
- Org features: `/src/lib/organizations.ts`
- Permissions: `supabase/migrations/20251220_org_permissions_rebuild.sql`
- Consent: `supabase/migrations/20251224_consent_system.sql`

---

## 14) Implementation Status (Updated)

### ✅ Database & Backend
- **Core cost schema + enums** implemented: `core.cost_categories`, `core.cost_events`, `core.cost_dimensions`, `core.cost_event_dimensions`, `core.staff_rates`, `core.service_catalog`.  
  Migration: `/supabase/migrations/20251227_costing_ledger.sql`
- **Permissions + RLS** for cost tables applied: `cost.view`, `cost.manage`, `cost.report`, `cost.admin` with org role bindings.
- **Inventory distribution trigger** creates cost events with unit cost fallback (`distribution_items.unit_cost` → `core.items.cost_per_unit` → `donations.catalog_items.unit_cost_cents`) and **hard errors** if org/unit cost missing.
- **Inventory distribution RPCs** updated to require `provider_org_id` and accept `unit_cost` on distribution items.
- **Appointments staff role** added: `/supabase/migrations/20251227_appointments_staff_role.sql`.
- **Outreach logging** now creates cost events for duration/service/override.
- **Appointments completion** creates cost events using staff rates + required staff role/duration.
- **Reporting rollups** materialized views + secure views implemented in `analytics`, with nightly `pg_cron` refresh and admin refresh RPC.

### ✅ Frontend
- **Org Costs tab** implemented at `/ops/organizations/[id]?tab=costs` with:
  - Staff rates manager
  - Service catalog manager
  - Cost dimension manager  
  Component: `/src/components/workspace/costs/cost-settings-tab.tsx`
- **Reports dashboard** implemented at `/ops/reports/costs`.
  - `OrgCostSummary` chart
  - `CostBreakdownByCategory` table
- **Client costs view** implemented at `/ops/clients/[id]?view=costs`.
  - `CostSnapshotCard`
  - `CostTimelineTable`
- **Navigation gating** added for Costs under Reports group (requires `cost.report`).

### ✅ Types / Infra
- Supabase types updated to include `analytics` views, cost enums, and cost tables in `/src/types/supabase.ts`.

### ⏳ Remaining (Not Implemented Yet)
- **Backfill jobs** for historical distributions/activities (Section 9).
- **Automated test coverage** for RLS verification + UI workflows (Section 10).
