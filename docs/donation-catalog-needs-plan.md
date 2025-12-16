# Donation Catalogue “Live Needs” Plan (STEVI + iharc.ca)

## Summary
Make the public donation catalogue feel *inventory-backed* (what’s short, what’s in stock, what’s most urgent) while keeping STEVI as the single admin surface for catalogue configuration and inventory updates.

This plan builds on what already exists:
- **STEVI** ops/admin already manages donation catalogue items, categories, Stripe sync, and inventory stock transactions.
- **Supabase** already exposes inventory-derived metrics in `donations.catalog_item_metrics` and the public marketing view `portal.donation_catalog_public`.
- **iharc public site** already consumes `portal.donation_catalog_public` via `getDonationCatalog()` and supports a one-time custom amount + monthly donations.

## Goals
- Public donation browsing defaults to a “needs list” using live stock counts.
- Visitors can quickly donate toward the biggest gaps (“Fill the gap”).
- Admin/staff can control: targets, categories, visibility, and ordering *from STEVI*.
- Inventory or catalogue changes propagate quickly to iharc.ca (cache revalidation).

## Non-goals
- No new payment providers or donation flows (Stripe/Supabase edge functions stay).
- No donor identity features in STEVI (donor portal remains on public site).
- No schema changes without confirming shared-schema impact across apps.
- No feature flags, back-compat shims, or silent fallbacks (both apps are pre-production).

## Current State (confirmed)
### STEVI surfaces
- Catalogue overview: `/ops/inventory` (Inventory hub; donation overview TBD).
- Per-item donation listing editor (includes target buffer, categories, activation gating, Stripe sync):
  - `src/components/workspace/inventory/item-detail/InventoryItemDetail.tsx` (`DonationListingCard`).
- Admin actions with audit + revalidation:
  - `src/app/(ops)/ops/admin/donations/actions.ts` (`saveCatalogItem`, categories, Stripe sync).

### Supabase objects
- `donations.catalog_items` (includes `target_buffer`, `priority`, `is_active`, `image_url`, Stripe IDs).
- `donations.catalog_categories` + `donations.catalog_item_categories` (category labels, public/private flags, ordering).
- `donations.catalog_item_metrics` (view: `current_stock`, `target_buffer`, `distributed_last_30_days`, etc.).
- `portal.donation_catalog_public` (view used by marketing site; includes `target_buffer`, `current_stock`, `distributed_last_30_days`, category arrays).

## Public “Needs” UX (iharc.ca)
### Metrics (client-derived from public view fields)
- `shortBy = max(0, targetBuffer - currentStock)` (when both available).
- `needPct = shortBy / targetBuffer` (when `targetBuffer > 0`).
- `burnRatePerDay = distributedLast30Days / 30` (when available).
- Optional: `daysOfStock = currentStock / burnRatePerDay` (only when `burnRatePerDay > 0`).

### UI behaviours
- Default filter: **Needed only** (ON)
  - Show items where `targetBuffer > 0` and `shortBy > 0`.
  - “Show all” reveals everything that is public + active (including items without targets).
- Default sort: **Most needed**
  - Primary: `needPct` (descending)
  - Tie-breakers: `shortBy` (descending) → `burnRatePerDay` (descending) → `priority` (ascending) → `title`.
- Action: **Fill the gap**
  - Sets cart quantity to `min(shortBy, 99)` (cap is fixed; keep it consistent across both repos).
  - Remains additive (user can still +/− adjust).
- Cards display
  - Progress bar “On hand / Target”
  - Badge “Short by X” (when `shortBy > 0`)
  - Optional small “~N days left” label when derivable
- Categories: render as chips using `category_slugs` as the filter key and `category_labels` for display (labels are not stable identifiers).

## Data Contract / View Expectations
### Required (already present on `portal.donation_catalog_public`)
- `target_buffer`, `current_stock`, `distributed_last_30_days`
- `category_slugs`, `category_labels`
- `priority`, `unit_cost_cents`, `image_url`, `default_quantity`

### Optional improvements (may require a view change)
- `catalog_updated_at` (from `donations.catalog_items.updated_at`)
- `stock_updated_at` (derived from latest `inventory.inventory_transactions.created_at` per item)
- A public categories view (ordered chips): `portal.donation_catalog_categories_public` exposing `slug,label,sort_order`

## Cross-app Cache Revalidation (critical)
Marketing site caches donation catalog. Updates propagate automatically via a timed cache (60s).

Plan:
- Keep the donation catalogue cache TTL at 60 seconds.
- Do not add cross-app invalidation hooks or secrets (pre-production; keep operations simple).

## Implementation Phases
### Phase 1 — iharc.ca UX (public site)
- Implement “Needed only” toggle + category chips + improved sorting.
- Add “Fill the gap” button and progress bar per card (reuse existing `Progress` component).
- Add derived labels (“Short by”, optional “days left”).
- Keep existing monthly + one-time checkout flows unchanged.

### Phase 2 — STEVI admin enhancements (minimal, high value)
- Donation catalogue list: add “Target”, “Short by”, “Need %” columns (computed from metrics).
- Inventory item Donations tab: add a “Marketing preview” block with the same computed fields so staff see what will rank.

### Phase 3 — Revalidation plumbing
- No cross-app revalidation plumbing (timed cache only).

### Phase 4 — QA + rollout
- Add tests:
  - Unit tests for the need-math helper (both repos can share identical logic locally).
  - Playwright smoke on marketing: toggle needed-only, apply category, click fill-the-gap, verify cart updates.
- Validate `npm run lint` + `npm run typecheck` in both repos.
- Ship directly (pre-production; no feature flag).

## Open Questions
- Remember “Needed only” preference (localStorage) vs always defaulting ON? (Decision: always default ON; keep it simple.)
- Should category chips use `catalog_categories.sort_order` (requires public view) or keep alphabetical labels? (Decision: alphabetical until a public categories view exists.)

## Implementation Notes / References
- STEVI donation admin actions: `src/app/(ops)/ops/admin/donations/actions.ts`
- STEVI donation catalogue UI: `src/components/workspace/admin/donations/donation-catalog-admin.tsx`
- STEVI inventory item donation editor: `src/components/workspace/inventory/item-detail/InventoryItemDetail.tsx`
- Marketing site donation catalog loader: `src/data/donation-catalog.ts`
