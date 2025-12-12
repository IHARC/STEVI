# Fundraising + Inventory Catalog (Stripe + Supabase) — Implementation Plan

Date: 2025-12-12

This plan covers:
- `iharc.ca` public donation experience (I.H.A.R.C-Public-Website repo)
- STEVI admin back-office workflows (STEVI repo)
- Supabase as the shared contract layer (schemas: `donations`, `inventory`, `portal`)
- Stripe as the payments provider (Checkout + Billing + Customer Portal + Webhooks)

The goal is to add **custom one-time donations**, **monthly recurring donations**, and a **World Vision-style “symbolic item catalog”** while keeping STEVI as an admin portal (not an e-commerce UI) and keeping the public site free of secrets and bespoke payment logic.

---

## Status (as of 2025-12-12)

### Answered design decisions (locked)

- **Monthly donations:** amount-only (no symbolic items), with **preset amounts + custom** amount entry.
- **Receipts:** IHARC is a **registered non-profit (not yet a charity)**.
  - Issue **standard donation receipts** (email) for record-keeping/reconciliation.
  - **Not tax deductible** at this time (must be stated clearly).
  - **No HST** charged/collected because the payment is a donation (not a taxable sale).
- **Inventory accounting:** donations **do not auto-increase inventory**. Inventory on the public catalog reflects the **actual inventory system** only (staff purchases/receives and updates inventory; the public view then updates).

### Completed in this repo + Supabase (applied, not just drafted)

- **Supabase migration applied to the shared project**:
  - Supabase migration version: `20251212160618`
  - Supabase migration name: `fundraising_stripe_donations_20251212`
  - Verified via `supabase_migrations.schema_migrations` and `supabase list_migrations`.
- **Migration file checked into repo** for reproducibility:
  - `STEVI/supabase/migrations/20251212160618_fundraising_stripe_donations.sql`
- **Schema changes now live (high level):**
  - New tables: `donations.donors`, `donations.donation_subscriptions`, `donations.donation_intent_items`, `donations.stripe_webhook_events`, `donations.stripe_amount_prices`, `donations.stripe_products`, `donations.donor_manage_tokens`, `donations.rate_limit_logs`
  - New RPC: `donations.donations_check_rate_limit(...)` (service_role-only)
  - Modified tables:
    - `donations.donation_intents`: removed legacy JSON `items` and `donor_email`; added `donor_id` and `custom_amount_cents`
    - `donations.donation_payments`: now supports intent *or* subscription payments (nullable `donation_intent_id`, new `donation_subscription_id`, and provider invoice/charge ids)
    - `donations.catalog_items`: added `stripe_product_id` for Stripe binding (optional)
- **STEVI types updated** to reflect the new `donations` schema:
  - `STEVI/src/types/supabase.ts` updated (manual sync to the live DB schema).

### Not started yet (next implementation blocks)

- **Supabase Edge Functions** (Stripe secrets live here; invoked by iharc.ca with anon key):
  - `donations_create_checkout_session`
  - `donations_create_subscription_session`
  - `donations_request_manage_link` (email-based manage flow)
  - `donations_create_portal_session` (Stripe Customer Portal session)
  - `donations_stripe_webhook` (signature verified + idempotent)
- **Public website UX** (`I.H.A.R.C-Public-Website`):
  - Replace the current mailto-only `/donate` with a cart + preset/custom one-time donation + monthly preset/custom flow.
  - Add `/donate/success`, `/donate/cancel`, `/manage-donation`.
- **STEVI admin UX**:
  - Wire `/ops/admin/website/fundraising` to real fundraising tooling (and reconcile with the existing `/ops/admin/donations` surfaces).

---

## 0) Non-negotiables / Constraints

1. **Supabase remains the “go-between”**  
   - Marketing site reads public-safe views (anon key only).
   - STEVI admin writes configuration and sees private donor/payment data under strict RLS.
2. **No Stripe secrets in either frontend repo**  
   - All Stripe secret usage lives in Supabase Edge Functions (or other server-only environment).
3. **No bespoke card collection**  
   - Use Stripe Checkout (hosted) for one-time and subscriptions.
   - Use Stripe Customer Portal for self-service subscription management.
4. **Security**  
   - Re-validate all amounts server-side in Edge Functions (never trust cart totals from the browser).
   - Webhook processing must be idempotent and signature-verified.
   - Rate limit all public “create checkout session” endpoints.
5. **Auditability**  
   - Any STEVI admin mutation must record an audit trail entry (existing STEVI standard).

---

## 1) What exists today (baseline)

### Public website (I.H.A.R.C-Public-Website)
- `/donate` already renders a “catalog” backed by Supabase and uses ISR caching.
- Catalog data loader: `src/data/donation-catalog.ts` reads `portal.donation_catalog_public`.

### Supabase
- `donations.catalog_items` (includes `inventory_item_id`, `unit_cost_cents`, and optional `stripe_price_id`).
- `donations.donation_intents` and `donations.donation_payments` exist.
- `donations.catalog_item_metrics` view already joins `inventory.v_items_with_balances` + distribution rollups.
- `portal.donation_catalog_public` view exposes a public-safe catalog projection.

### STEVI
- Admin entry exists: `/ops/admin/website/fundraising` is a stub page.
- Website & marketing admin already manages `portal.public_settings` via server actions in `src/app/(ops)/ops/admin/marketing/*`.

---

## 2) Target architecture (end-to-end)

### A) One-time donation (“cart + symbolic items + custom amount”)

1. Donor builds cart on `iharc.ca` (client-side state, persisted locally).
2. Donor clicks “Checkout”.
3. Public site calls Supabase Edge Function: `donations_create_checkout_session` with cart items + optional custom amount.
4. Edge Function:
   - re-loads items/prices from Supabase
   - validates quantity limits and custom amount bounds
   - creates a `donations.donation_intent` row
   - creates a Stripe Checkout Session in `mode=payment`
   - returns `session.url` for redirect
5. Stripe Checkout collects email + name + address (required) and processes payment.
6. Stripe sends webhooks → Supabase Edge Function `donations_stripe_webhook`:
   - verifies signature
   - idempotently writes `donations.donation_payments`
   - marks `donations.donation_intents` paid/failed/refunded
   - stores donor PII in a private table (see data model)
7. STEVI admin uses reporting + reconciliation screens.

### B) Monthly recurring donation (“custom amount subscription”)

1. Donor chooses “Monthly” on `iharc.ca` and enters amount.
2. Public site calls Supabase Edge Function `donations_create_subscription_session`.
3. Edge Function:
   - validates amount bounds
   - resolves or creates a Stripe recurring Price for that amount (see “Price strategy” below)
   - creates Stripe Checkout Session in `mode=subscription` (1 recurring line item)
4. Stripe Checkout collects email + name + address and creates subscription.
5. Webhooks update Supabase donation subscription tables.

### C) Subscription management (cancel/update payment method)

Use Stripe Customer Portal for donor self-serve, without requiring a STEVI login.

Flow:
- `iharc.ca/manage-donation` prompts for donor email.
- If email matches an active subscription, send a magic link via email (Supabase Edge Function + relay).
- Magic link opens a short-lived portal session (Stripe Customer Portal).

This avoids building donor accounts inside STEVI and keeps “donor UX” on `iharc.ca`.

---

## 3) Stripe design decisions

### 3.1 Checkout vs Elements
- **Stripe Checkout** only. No Elements/PaymentIntents in the public site.

### 3.2 Price strategy (important for “custom monthly amount”)

Goal: support arbitrary donor-entered monthly amounts without creating unbounded Stripe objects.

Recommended:
- Constrain monthly custom donations to **whole-dollar increments** and enforce min/max (e.g., `$5–$5,000`).
- Maintain a Supabase mapping table: `donations.stripe_amount_prices`:
  - `(currency, interval, amount_cents) -> stripe_price_id`
- When creating a subscription session:
  - lookup price in Supabase mapping
  - if missing, create Stripe Price once (for a fixed “Monthly donation” product) and store it

This yields at most *N unique prices for N unique amounts*, avoids recreating prices for repeated amounts, and keeps logic server-side.

### 3.3 Required billing details
- In Checkout Session creation:
  - require address collection (billing address) and name
  - store those details on Stripe Customer and in Supabase on webhook receipt

### 3.4 Customer Portal
- Configure in Stripe Dashboard:
  - allow cancellation
  - allow payment method updates
  - define proration rules if you later add “upgrade/downgrade” (optional)

---

## 4) Supabase data model (contract layer)

Keep public surfaces as **views** in `portal` and keep sensitive data in `donations` behind strict RLS.

### 4.1 Extend donations schema

Add tables (names are proposals; confirm naming conventions with existing schema):

1. `donations.donors`
   - `id (uuid)`
   - `email (text)` (unique lowercased)
   - `name (text, nullable)`
   - `address (jsonb, nullable)` (Stripe address object shape)
   - `stripe_customer_id (text, nullable, unique)`
   - timestamps

2. `donations.donation_subscriptions`
   - `id (uuid)`
   - `donor_id (uuid fk)`
   - `status (active|canceled|past_due|unpaid|incomplete|incomplete_expired)`
   - `currency (text)`
   - `amount_cents (int)`
   - `stripe_subscription_id (text, unique)`
   - `stripe_price_id (text)`
   - `started_at`, `canceled_at`
   - `last_invoice_status`, `last_payment_at`
   - timestamps

3. `donations.donation_intent_items`
   - `id (uuid)`
   - `donation_intent_id (uuid fk)`
   - `catalog_item_id (uuid fk)`
   - `quantity (int)`
   - `unit_amount_cents (int)`
   - `line_amount_cents (int)`

4. `donations.stripe_webhook_events`
   - `id (uuid)`
   - `stripe_event_id (text, unique)`
   - `type (text)`
   - `received_at`
   - `processed_at`
   - `status (succeeded|failed)`
   - `error (text, nullable)`
   - `raw_payload (jsonb)` (optional; consider storage cost)

5. `donations.stripe_amount_prices` (for recurring custom amount mapping)
   - `currency (text)`
   - `interval (text)` (month)
   - `amount_cents (int)`
   - `stripe_price_id (text, unique)`
   - timestamps

### 4.2 Public views for the marketing site

Keep `portal.donation_catalog_public` as the stable public contract. If we need more public content:
- `portal.donation_campaigns_public` (if/when campaigns exist)
- `portal.donation_stats_public` (aggregated, non-PII)

### 4.3 RLS & privacy requirements

Must enforce:
- marketing site anon key can only read `portal.*_public` views
- only IHARC admins (and any approved roles) can read `donations.donors` and subscription/payment tables
- webhook functions need service access (Edge Function environment), not user-supplied tokens

---

## 5) Supabase Edge Functions (server-only Stripe integration)

### 5.1 Public functions (invoked from iharc.ca with anon key)

1. `donations_create_checkout_session`
   - input: items + quantities, optional custom amount, return URLs
   - validates everything by reloading from Supabase
   - creates `donation_intent` + `donation_intent_items`
   - creates Stripe Checkout Session `mode=payment`
   - stores `stripe_session_id` on intent
   - returns `url`

2. `donations_create_subscription_session`
   - input: monthly amount, return URLs
   - resolves/creates recurring price via mapping table
   - creates Stripe Checkout Session `mode=subscription`
   - stores linkage for reconciliation (metadata)
   - returns `url`

3. `donations_request_manage_link`
   - input: email
   - rate limit hard (per IP + per email)
   - if email has active subscription, send a one-time link to donor

4. `donations_create_portal_session`
   - input: one-time token (from email link)
   - validates token, resolves Stripe customer, creates Stripe Customer Portal session
   - returns `url` redirect

### 5.2 Webhook function

5. `donations_stripe_webhook`
   - verifies Stripe signature
   - idempotency: store `stripe_event_id` first and skip duplicates
   - handles key event types:
     - `checkout.session.completed` (one-time or subscription)
     - `invoice.paid`, `invoice.payment_failed` (recurring lifecycle)
     - `customer.subscription.updated`, `customer.subscription.deleted`
     - `charge.refunded` / `refund.updated` (if used)
   - writes to:
     - `donations.donation_payments`
     - `donations.donation_subscriptions`
     - `donations.donors`
     - `donations.stripe_webhook_events`

### 5.3 Rate limiting

Reuse existing DB rate-limit patterns (e.g., `portal_check_rate_limit`) or add a `donations_check_rate_limit` RPC.

---

## 6) Public website (I.H.A.R.C-Public-Website) deliverables

### 6.1 Donor UX
- `/donate`:
  - world-vision style catalog browsing and filtering (category, “most needed”, etc.)
  - item detail view (optional) with “impact narrative”
  - “add to cart” + cart drawer/page
  - “add a custom amount” line (one-time)
  - separate “Monthly donation” CTA that triggers subscription checkout flow
- `/donate/success` and `/donate/cancel`:
  - success page must call back to Supabase (read-only) for a safe confirmation message (don’t trust redirect alone)
  - clear receipt + support/cancellation instructions
- `/manage-donation`:
  - email entry form → success confirmation (“check your inbox”)

### 6.2 Technical constraints
- No Stripe secret usage in the Next.js app.
- No direct writes to Supabase tables from the public site; only Edge Function invocations.
- Treat all cart state as untrusted; Edge Functions re-compute totals.

---

## 7) STEVI admin (Website & Marketing > Fundraising) deliverables

Implement in `STEVI/src/app/(ops)/ops/admin/website/fundraising/*`:

### 7.1 Catalog management (symbolic items)
- CRUD for `donations.catalog_items`
  - map to `inventory` item via `inventory_item_id` (select from inventory list)
  - set title/slug/description/category/image
  - set `unit_cost_cents`, currency, default quantity, priority
  - set `target_buffer` override (optional; inventory minimum threshold is fallback)
  - set active/inactive

### 7.2 Stripe bindings for catalog items
- “Create/Update Stripe Price” action per catalog item
  - creates a one-time Price in Stripe and stores `stripe_price_id`
  - prevents accidental duplication (idempotency / confirmation)

### 7.3 Donations + subscriptions ops
- “Donations inbox” view:
  - recent one-time donations, statuses, refunds
  - export CSV for reconciliation
- “Monthly donors” view:
  - active subscriptions, status, amount, start date
  - admin cancel (writes audit + calls Stripe)
  - resend manage-link email

### 7.4 Webhook health
- recent webhook events, last success timestamp, failures with retry button

### 7.5 Audit & permissions
- gate behind `canManageWebsiteContent` (already enforced by layout)
- all mutations use server actions + audit logging patterns already used in STEVI admin

---

## 8) Phased delivery plan (recommended)

### Phase 1 — Data + Admin foundations (no payments live)
- Confirm/extend Supabase `donations` schema tables + RLS.
- Implement STEVI fundraising admin CRUD for catalog items.
- Confirm marketing site reads stay stable (`portal.donation_catalog_public`).

### Phase 2 — One-time Checkout MVP (test mode)
- Build `donations_create_checkout_session` Edge Function.
- Build `donations_stripe_webhook` with idempotent processing.
- Add `iharc.ca` cart + checkout redirect.
- Add success/cancel pages + basic donor confirmation.

### Phase 3 — Monthly donations + self-service cancel
- Implement recurring price mapping + `donations_create_subscription_session`.
- Configure Stripe Customer Portal.
- Implement email-based manage link flow (`request_manage_link` + `create_portal_session`).

### Phase 4 — Reporting, refunds, reconciliation
- Add refund flow (admin-only) if needed.
- Add exports, metrics, dashboard cards in STEVI.
- Add non-PII donation stats to marketing site if desired.

### Phase 5 — Hardening + launch
- Load tests on Edge Functions (rate limit tuning).
- Security review (PII exposure, RLS, webhook verification, replay attacks).
- Observability: alerts on webhook failures and session creation errors.

---

## 9) Open questions (answer before implementation)

1. Should monthly donations support “symbolic items” (e.g., sponsor socks monthly), or should monthly be **amount-only**?  
   **Answer:** amount-only. UI will include preset amounts + custom.

2. Receipt requirements (CRA/charitable receipts):  
   **Answer:** issue standard receipts (email) but explicitly **not tax deductible** today. No HST because these are donations.

3. Refund policy + cancellation policy copy (needed to reduce disputes):  
   **Pending:** add final copy + location (marketing page + checkout terms link). Implemented UX must include clear dispute-reduction messaging.

4. Donation impact accounting:  
   **Answer:** do not auto-adjust inventory. Public catalog reflects inventory system reality only; donations are funding and may be used elsewhere.

---

## 10) Implementation safety checklist (do-not-break items)

- Do not change the shape of `portal.donation_catalog_public` without updating `I.H.A.R.C-Public-Website/src/data/donation-catalog.ts`.
- Do not expose `donations.*` tables to anon reads.
- Always re-validate item amounts and totals server-side (Edge Functions).
- Webhook handler must be signature-verified + idempotent.
- All admin changes must write to audit trail and respect existing RLS + roles.
