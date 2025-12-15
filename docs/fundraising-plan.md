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

### Completed implementation blocks (delivered)

- **Supabase Edge Functions deployed (Stripe configured via Vault):**
  - Public flows:
    - `donations_create_checkout_session` (one-time donation: catalogue items + optional custom amount)
    - `donations_create_subscription_session` (monthly amount-only donations; whole-dollar increments)
    - `donations_request_manage_link` (email-based manage link; rate-limited; privacy-preserving responses)
    - `donations_create_portal_session` (token → Stripe Customer Portal session)
    - `donations_get_checkout_status` (success-page confirmation helper)
  - Webhooks + admin-only helpers:
    - `donations_stripe_webhook` (signature verified + idempotent + writes donor/payment/subscription tables + sends receipt emails)
    - `donations_admin_sync_catalog_item_stripe` (create/update Stripe Product+Price for a catalogue item; admin-gated)
    - `donations_admin_cancel_subscription` (cancel subscription in Stripe; admin-gated)
    - `donations_admin_resend_manage_link` (admin resend flow)
    - `donations_admin_reprocess_webhook_event` (retry failed Stripe events by `evt_...`)

- **Public website UX** (`I.H.A.R.C-Public-Website`):
  - `/donate` now supports:
    - world-vision style catalogue browsing + filtering + “most needed” sort
    - cart drawer, quantity controls, optional custom amount, and secure Stripe Checkout redirect
    - monthly donations (preset + custom; amount-only as locked)
    - clear receipt note: **registered non-profit, not tax deductible**
  - Added:
    - `/donate/success` (server-rendered confirmation; validates via Edge Function)
    - `/donate/cancel`
    - `/manage-donation` (request manage link)
    - `/manage-donation/portal` (token → redirect to Stripe Customer Portal)

- **STEVI admin UX** (Website & Marketing > Fundraising):
  - `/ops/admin/website/fundraising` is now the single fundraising admin surface:
    - catalogue CRUD + inventory mapping (reuses existing donation catalogue admin component patterns)
    - Stripe binding is handled by a “Sync Stripe price” action (no manual Stripe ID editing)
    - donations inbox, monthly donors table (cancel + resend manage link), webhook health + retry
  - Legacy `/ops/admin/donations` actions were removed; fundraising is consolidated under `/ops/admin/website/fundraising`.

---

## Audit findings + fixes applied (2025-12-12)

### ✅ Fixed: “Manage donation” portal flow failed from server-rendered pages
- **Finding:** `donations_create_portal_session` relied on the `Origin` header. The marketing site portal route (`/manage-donation/portal`) invokes Edge Functions from a server component (no `Origin` header), which caused failures and silent redirects.
- **Fix:** Donation Edge Functions now generate success/cancel/portal return URLs from `IHARC_SITE_URL` (required Edge Function env var) and do not require or trust `Origin` for URL construction.
- **UX fix:** `/manage-donation/portal` now shows an explicit “link expired / request a new link” state instead of redirect loops.

### ✅ Implemented: Admin-configurable Stripe mode + secrets (no fallbacks)
- **Finding:** Stripe config needed to be switchable to test mode safely without redeploying or editing secrets in multiple places.
- **Fix:** Stripe secrets are now **Supabase Vault-backed** and selected via `portal.public_settings` under a single active mode:
  - Configure via `STEVI Admin → Website & Marketing → Fundraising → Stripe configuration`
  - Keys:
    - `stripe_donations_mode` (`test` | `live`)
    - `stripe_donations_test_secret_key_id`, `stripe_donations_test_webhook_secret_id`
    - `stripe_donations_live_secret_key_id`, `stripe_donations_live_webhook_secret_id`
  - **No environment-variable fallbacks** are used by the donations functions.

### ✅ Hardened: Webhook verification + retry correctness
- **Finding:** Webhook signature verification must use the raw request body bytes and retries must share the same processing path.
- **Fix:** Webhook verification uses raw body bytes and admin reprocessing uses the same shared processing code path as the webhook handler.

### ✅ Hardened: Public CORS + origin handling
- **Finding:** Trusting arbitrary `Origin` headers is not appropriate for payments flows.
- **Fix:** Donation Edge Functions now use a strict allowlist based on `IHARC_SITE_URL` (plus local dev origins) and default to the site origin when the inbound origin is not allowed.

### ✅ Aligned: Monthly donation amount rules in UI
- **Finding:** Monthly donations are whole-dollar only by plan; client validation didn’t enforce this strictly.
- **Fix:** The marketing donation UI now blocks non-whole-dollar monthly amounts, matching server-side validation.

## 0) Non-negotiables / Constraints

1. **Supabase remains the “go-between”**  
   - Marketing site reads public-safe views (anon key only).
   - STEVI admin writes configuration and sees private donor/payment data under strict RLS.
2. **No Stripe secrets in either frontend repo**  
   - All Stripe secret usage lives in Supabase Edge Functions (configured via Supabase Vault + STEVI admin).
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
6. Stripe sends webhooks → **STEVI webhook relay** → Supabase Edge Function `donations_stripe_webhook`:
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

5. `donations_get_checkout_status`
   - input: `sessionId`
   - returns: safe “mode + payment_status + amount/currency” for the success page
   - note: does not expose donor PII

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

**Webhook delivery note (important):**
- Supabase Edge Functions require an Authorization header even when `verify_jwt = false`.
- Stripe cannot send Supabase auth headers, so the webhook endpoint is implemented as a **STEVI API relay**:
  - Stripe → `STEVI/src/app/api/donations/stripe-webhook/route.ts` → Supabase `donations_stripe_webhook`
  - This preserves the “no secrets on the public site” rule and keeps webhook signature verification inside the Edge Function.

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

## 11) Deployment checklist (now required to go live)

### Stripe Dashboard
- Configure Checkout success/cancel URLs to match `iharc.ca` routes:
  - `/donate/success?session_id={CHECKOUT_SESSION_ID}`
  - `/donate/cancel`
- Configure a webhook endpoint pointing to STEVI (relay):
  - `https://stevi.iharc.ca/api/donations/stripe-webhook`
  - Event types to enable:
    - `checkout.session.completed`
    - `invoice.paid`
    - `invoice.payment_failed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `charge.refunded`
- Ensure Stripe Customer Portal is enabled for self-serve cancellation + payment method updates.

### Supabase Edge Function secrets (set in the Supabase project)
- `IHARC_SITE_URL` (e.g., `https://iharc.ca`) — used to generate success/cancel/portal return URLs (no Origin header trust)
- Stripe configuration is **Vault-backed and admin-managed** (no env-var fallbacks):
  - Set via **STEVI Admin → Website & Marketing → Fundraising → Stripe configuration**
  - Stored in Supabase Vault; referenced by `portal.public_settings` keys:
    - `stripe_donations_mode` (`test` | `live`)
    - `stripe_donations_test_secret_key_id`, `stripe_donations_test_webhook_secret_id`
    - `stripe_donations_live_secret_key_id`, `stripe_donations_live_webhook_secret_id`
- Donations email configuration is **Vault-backed and admin-managed**:
  - Set via **STEVI Admin → Website & Marketing → Fundraising → Email**
  - Stored in Supabase Vault; referenced by `portal.public_settings` keys:
    - `donations_email_from`
    - `donations_email_provider` (currently `sendgrid`)
    - `donations_sendgrid_api_key_secret_id`

### Public website env vars (build-time)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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
