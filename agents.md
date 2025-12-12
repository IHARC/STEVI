# STEVI Codex Agent Guide

STEVI (Supportive Technology to Enable Vulnerable Individuals) is IHARC’s multi‑tenant portal for clients, outreach staff, and partner organizations in Northumberland County, Ontario, Canada.

## Product + users
- IHARC (Integrated Homelessness & Addictions Response Centre) develops and operates STEVI.
- Stakeholder groups the app supports:
  - **IHARC Admins**: super admins for the entire app. Primary admin: Jordan@iharc.ca.
  - **IHARC Staff & Volunteers**: role‑scoped operational users (inventory, client mgmt, outreach, intakes, etc.).
  - **Organizations**: sub‑tenants (foodbank, outreach non‑profits, etc.) enabling continuum of care with client consent.
  - **Organization Admins / Users**: managed within each org; similar capabilities to IHARC staff but tenant‑scoped.
  - **Clients**: control what is shared via consent; use a client portal for appointments, plans, documents, and support.

## Ground rules (non‑negotiable)
- Assume Codex sessions run in workspace‑write. Use Azure CLI for all infra/state checks (Front Door, App Service, DNS). Subscription is **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`) and is the only scope to touch.
- Treat this repo + generated Supabase types as source of truth. If older docs (marketing repo, Notion, etc.) disagree, defer to the code/schema and call out the mismatch.
- Never add backward‑compatibility shims, hidden fallbacks, or keep dead/legacy code. Ship clean, explicit fixes aligned with IHARC privacy/audit expectations and WCAG commitments (see the marketing architecture doc in the marketing repo for WCAG guidance).
- Supabase schema is shared across STEVI, STEVI OPS, and marketing—do not alter it without coordination. Verify RLS/policies via Supabase MCP, not migrations alone.
- Keep audit, privacy, and rate limits intact. Every mutation must log to the audit trail and respect RLS + consent flags.

## Snapshot — 2025-12-12
- **Stack**: Next.js 16 App Router + server actions (React 19), TypeScript, Tailwind + shadcn/ui tokens from `src/styles/theme.css`, Radix primitives, TipTap for rich text.
- **Hosting/build**: Azure App Service (Linux, Node 24). `npm run build` → `node build.js` (runs `eslint .`, forces webpack via `NEXT_FORCE_WEBPACK=1`, emits `.next/standalone`, copies static into `.next/standalone/.next/static`). GitHub Actions `.github/workflows/main_stevi.yml` deploys via publish profiles. Runtime: `node .next/standalone/server.js`.
- **Auth/session**: Supabase Auth via `@supabase/ssr` cookies. Use `createSupabaseServerClient` in actions/route handlers (can set cookies). `createSupabaseRSCClient` is read‑only. Middleware `updateSession` refreshes sessions and applies CSP/HSTS/etc. Most authed routes export `dynamic = 'force-dynamic'`.
- **Caching**: No custom CDN layer. Use `revalidatePath`/`revalidateTag` from server actions; avoid static rendering for authed content.
- **Environment**: `.env.example` is current. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`. Optional: `PORTAL_ALERTS_SECRET`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_ANALYTICS_DISABLED`, `SUPABASE_SERVICE_ROLE_KEY` (local scripts only), `NEXT_PUBLIC_MARKETING_URL` (telemetry allowlist). Never commit secrets.

## Repository layout
- **Dual shells**:
  - Client shell: `src/app/(client)` with client layout/theme (`theme.client.css`) and nav in `src/lib/client-navigation.ts`.
  - Ops shell: `src/app/(ops)` with ops layout/theme (`theme.ops.css`) and nav in `src/lib/portal-navigation.ts`.
- **Components**:
  - `src/components/client`, `src/components/workspace`, `src/components/shared`.
  - UI primitives live at `src/components/shared/ui` (aliased as `@shared/ui`).
- **Aliases**: `@client/*`, `@workspace/*`, `@shared/*`, `@/*`. ESLint `no-restricted-imports` enforces shell boundaries.
- Key guards and routing helpers:
  - `src/lib/portal-areas.ts` (`requireArea`, landing resolution, preview parsing).
  - Client preview requires `?preview=1`; ops shell rejects preview mode.

## Supabase: schemas, tables, RPCs
- Schemas in active use: `portal`, `core`, `case_mgmt`, `inventory`, `donations`.
- Key tables:
  - `portal`: `profiles`, `profile_invites`, `profile_contacts`, `resource_pages`, `policies`, `notifications`, `public_settings`, `registration_flows`, `appointments`, `audit_log`.
  - `core`: `people`, `people_activities`, `person_access_grants`, `organizations`, org memberships, contact details.
  - `case_mgmt`: `case_management`.
  - `inventory`: `v_items_with_balances`, `locations`, stock transactions.
  - `donations`: `catalog_items`, `catalog_item_metrics`.
- Storage: bucket `portal-attachments` (document locker). Signed URLs default to 30‑minute TTL.
- Edge Functions (outside this repo): `portal-alerts` (optional, gated by `PORTAL_ALERTS_SECRET`) and `portal-admin-invite`.
- RPCs/functions used today: `get_user_roles`, `portal_log_audit_event`, `portal_queue_notification` (+ Edge alerts), `portal_check_rate_limit`, `portal_get_user_email`, `refresh_user_permissions`, `set_profile_role`, `claim_registration_flow`, `get_people_list_with_types`, `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`, inventory RPCs (`receive_stock`, `receive_stock_with_source`, `transfer_stock`, `adjust_stock`, `update_transaction_source`).
- **Authorization model**: `PortalAccess` (`src/lib/portal-access.ts`) derives capability flags only from `get_user_roles` + `ensurePortalProfile`. Never rely on JWT/app_metadata fallbacks or UI hiding alone.
- **Audit/rate limits**:
  - Route every mutation through `logAuditEvent`.
  - Public/registration flows must call `portal_check_rate_limit`.
- **Content safety**: sanitize TipTap/HTML with `sanitize-resource-html` and `sanitize-embed` before persisting.

## Current surfaces
- **Client portal**: Home/support/profile/consents/cases are wired to Supabase (`core.people`, `case_mgmt.case_management`, grants, activities). Appointments use `portal.appointments` with audited request/reschedule/cancel. Documents read from `portal-attachments`. Support composer queues `portal_queue_notification` + audit. Messages page is still a placeholder; Home “focus areas” are static.
- **Registration & public flows** (`/register/*`): get‑help, existing‑claim, community‑member, partner, volunteer, concern‑report write to `portal.registration_flows` and call `claim_registration_flow` when applicable.
- **Staff tools**: caseload/schedule/outreach log use core RPCs. Staff appointments surface uses `portal.appointments` with scoped server actions. Intake queue reads `portal.registration_flows`. Tasks view is placeholder.
- **Organization tools**: members/invites/settings scoped by org via `set_profile_role` + RLS; redirect if profile lacks org/approval.
- **Admin tools**:
  - Clients/consents/grants: `core.people`, `person_access_grants`, `get_people_list_with_types`.
  - Users/profiles/orgs: `portal.profiles`, `portal.profile_invites`, `set_profile_role`, `refresh_user_permissions`.
  - Resources/policies: TipTap editors persist to `portal.resource_pages` / `portal.policies` (sanitized HTML).
  - Notifications: `portal.notifications` + optional Edge alerts.
  - Marketing content: `portal.public_settings` powers the public site (read‑only marketing app).
  - Inventory/donations: `inventory` and `donations` schemas.
  - Service rules / warming room / templates are still stubs—keep guarded; add audit if wiring them.
- **Marketing integration**: marketing site remains read‑only. Plan cache/tag/webhook invalidation so admin updates propagate across apps.

## Development standards
- Use `createSupabaseServerClient` in actions/route handlers; never set cookies from RSC client.
- Keep routes dynamic unless truly static. Do not fetch roles client‑side; compute `PortalAccess` on the server and pass down.
- Verify RLS/consent with Supabase MCP before shipping; UI hiding is not security.
- Stay inside the shadcn token system in `src/styles/theme.css`; no ad‑hoc colors/spacing.
- Notifications: send via `queuePortalNotification`. Use `PORTAL_ALERTS_SECRET` locally only when exercising the Edge Function.
- Commands: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run e2e` (Playwright).
- Keep `.env.example` aligned with `docs/backend.md`. Never commit `SUPABASE_SERVICE_ROLE_KEY`.

## Recent changes (2025-12-08)
- Dual‑shell split delivered; onboarding gating is client‑layout only.
- Guards centralized in `src/lib/portal-areas.ts`.
- Navigation split and preview routing updated.
- Components reorganized into client/workspace/shared; shared UI under `@shared/ui`.
- Aliases and restricted imports enforce boundaries; CODEOWNERS updated.
- Docs and tests adjusted for split.

## Active plans and priorities
- **Ops navigation overhaul**: see `plan.md` for hub‑cap IA decisions, file pointers, and open questions.
- Outstanding work (prioritised):
  1. Wire the Messages page and staff Tasks view to real data (respect consent/RLS) and add audit trails.
  2. Add cache revalidation/webhook strategy so marketing and STEVI stay in sync after admin content updates.
  3. Metrics/governance/ops stubs (service rules, warming room, templates) need real data models, capability flags, and audit coverage if kept.
  4. Flesh out App Service ops runbook (alerts, slot swap procedure) and keep `README.md`/`docs/backend.md` in sync with platform changes.
  5. Increase automated coverage (Vitest + Playwright) for registration flows, consents, appointments/documents, notifications, inventory/donations.
  6. Mirror or pipeline Supabase Edge Functions (`portal-alerts`, `portal-admin-invite`, etc.) into this repo or clearly document their external home.

## Tooling notes
- Default to Azure CLI for infra:
  - Subscription: **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`).
  - Resource groups: `IHARC_public_apps` (Front Door, App Service, DNS `iharc.ca`), `IHARC` (core data), `contact_centre` (separate).
  - Front Door: profile `IHARC-FD`, endpoint `iharc` (`iharc-hngcbedraxgtfggz.z03.azurefd.net`).
  - App Service plan `IHARC-Linux` (B1; scale to B2 if needed). Apps: `STEVI` (`stevi.iharc.ca`), `IHARC-Login`.
  - Common commands: `az afd profile/list/route/origin/custom-domain`, `az webapp list/show/config access-restriction`, `az appservice plan show/update`, `az network dns zone/record-set cname`, `az account set --subscription IHARC-main-sub`.
- Use Context7 for library docs/codegen; use Supabase MCP for live schema/RLS inspection.
- Do not use Azure MCP—run Azure operations directly via CLI.
