# STEVI Agent Briefing
-IHARC(Integrated Homelessness & Addictions Response Centre) is the non-profit organization that is developing/operating this app. 
-IHARC Operates in Northumberland County, Ontario, Canada. 
-This app is named STEVI, which stands for Supportive Technology to Enable Vulnerable Individuals.

-The purpose of this app is a unified interface to support the following stakeholders/groups:

--IHARC Admins: These are essentially super admins that are responsible for administration of the entire app. The primary admin is Jordan@iharc.ca 
--IHARC Staff & Volunteers: These users will have varying permissions based on roles/responsibilities. Features for these roles may include inventory, client management, website admin, outreach work, intakes, etc. 
--Organizations: These can be thought of as sub-tenants of the app. Examples include the local foodbank, other non-profits that do outreach work, etc. The purpose is to allow access to app features to manage their operations and create a continuum of care for clients who consent.
--Organization Admins: These are users who are responsible for managing their designated organization. They will administer their respective organization users and organization information. 
--Organization Users: Similar to IHARC Staff/Volunteers in terms of functionality and scope, but are managed by organization admins. 
--Clients: Used to refer to anyone who utilizes the services of IHARC or any other applicable organization using the STEVI app. Information availability/sharing is entirely dictated based on client consents that they can control within their portal. Clients are users of the app and can leverage a client portal. The client portal is meant to allow a simple way to track all aspects of services provided by organizations and IHARC. It will also serve as platform to simplify clients on their journey to stability in terms of homelessness, addictions, health, etc. 

## Ground rules
- CLI runs in workspace-write; use the Azure CLI for all infra/state checks (Front Door, App Service, DNS). Subscription is already set to **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`); keep it scoped there.
- Treat this repo + Supabase types as the source of truth. If any older docs (marketing repo, Notion, etc.) conflict with the code/schema, defer to the code and call out the discrepancy.
- Never add backward-compatibility shims, hidden fallbacks, or keep dead/legacy code. Ship clean, explicit fixes that honour IHARC’s and WCAG commitments (see marketing architecture doc referenced in the marketing repo).
- Supabase schema is shared across STEVI, STEVI OPS, and the marketing app—do not alter it without coordination. Verify policies via Supabase MCP, not migrations alone.
- Keep audit, privacy, and rate limits intact; every mutation should log to the audit trail and respect RLS/consent flags.

## Snapshot — 2025-12-08
- Product: STEVI (Supportive Technology to Enable Vulnerable Individuals) operated by IHARC (Northumberland County, ON, Canada).
- Stack: Next.js 16 (App Router + server actions, React 19), TypeScript, Tailwind with shadcn/ui tokens from `src/styles/theme.css`, Radix primitives, and TipTap for rich text.
- Hosting/build: Azure App Service (Linux, Node 24). `npm run build` → `node build.js` (runs `eslint .`, forces webpack via `NEXT_FORCE_WEBPACK=1`, copies static into `.next/standalone/.next/static`). GitHub Actions `.github/workflows/main_stevi.yml` deploys via publish profiles; runtime start is `node .next/standalone/server.js`. Marketing app deploys separately but shares the Supabase project/env vars.
- Auth/session: Supabase Auth via `@supabase/ssr` cookies. Use `createSupabaseServerClient` inside actions/route handlers to set cookies; `createSupabaseRSCClient` is read-only and warns if it would set cookies. Middleware `updateSession` keeps Supabase sessions fresh and applies security headers (CSP, HSTS, etc.). Most portal routes export `dynamic = 'force-dynamic'` to respect session + RLS.
- Data & storage: Supabase schemas in active use: `portal`, `core`, `case_mgmt`, `inventory`, `donations`. Key portal tables: `profiles`, `profile_invites`, `profile_contacts`, `registration_flows`, `public_settings`, `resource_pages`, `policies`, `notifications`, `appointments`, `audit_log`. Storage bucket `portal-attachments` powers the document locker. Edge Functions: `portal-alerts` (optional via `PORTAL_ALERTS_SECRET`) and `portal-admin-invite` (used for invites).
- Caching: No custom CDN layer. Use `revalidatePath`/`revalidateTag` from server actions; avoid static rendering for authed content.
- Environment: `.env.example` is present. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`. Optional: `PORTAL_ALERTS_SECRET`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_ANALYTICS_DISABLED`, `SUPABASE_SERVICE_ROLE_KEY` (local scripts only), `NEXT_PUBLIC_MARKETING_URL` (telemetry allowlist). Never commit secrets.

## Architecture & data flow
- Responsibility split: STEVI owns authenticated client/staff/admin surfaces and all writes. The marketing site consumes Supabase content read-only (public settings, resources, policies, donation catalogue, stats).
- Key tables:
  - `portal`: `profiles`, `profile_invites`, `profile_contacts`, `resource_pages`, `policies`, `notifications`, `public_settings`, `registration_flows`, `appointments`, `audit_log`.
  - `core`: `people`, `people_activities`, `person_access_grants`, `organizations`, org memberships, contact details.
  - `case_mgmt`: `case_management` (client cases).
  - `inventory`: `v_items_with_balances`, `locations`, stock transactions.
  - `donations`: `catalog_items`, `catalog_item_metrics` (linked to inventory items).
- RPCs / functions used today: `get_user_roles`, `portal_log_audit_event`, `portal_queue_notification` (+ `portal-alerts` Edge Function), `portal_check_rate_limit`, `portal_get_user_email`, `refresh_user_permissions`, `set_profile_role`, `claim_registration_flow`, `get_people_list_with_types`, `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`, inventory RPCs (`receive_stock`, `receive_stock_with_source`, `transfer_stock`, `adjust_stock`, `update_transaction_source`), and Supabase Function `portal-admin-invite` for partner/user invites.
- Authorization: `PortalAccess` (`src/lib/portal-access.ts`) derives capability flags exclusively from `get_user_roles` + `ensurePortalProfile`. Never rely on JWT/app_metadata fallbacks or UI hiding alone.
- Audit/logging: Route every mutation through `logAuditEvent`; consent/person updates, appointments, support messages, and admin actions already follow this pattern—keep it consistent.
- Rate limiting: `portal_check_rate_limit` backs the public/registration flows. Keep it in the loop when adding new anonymous endpoints.
- Content safety: sanitize TipTap/HTML using `sanitize-resource-html` and `sanitize-embed` before persisting.

-## Navigation
- Split shells: client navigation is defined in `src/lib/client-navigation.ts` and rendered only in `src/app/(client)`. Ops navigation (frontline/org/HQ) lives in `src/lib/portal-navigation.ts` and is rendered only in `src/app/(ops)`.
- Client preview is opt-in via `?preview=1` and only for users with ops access; ops shell does not render preview mode.
- Best practice for new surfaces:
  1. Add/adjust capability flags in `PortalAccess` as needed (reuse existing roles/RLS).
  2. Add links to the correct shell nav file; never cross-import shell components. Shared pieces belong in `components/shared` or `lib`.
  3. Guard pages/actions with `requireArea` from `src/lib/portal-areas.ts` and ensure Supabase RLS matches.
  4. Add cache invalidation/tagging as needed and update tests.
  5. Keep UI consistent with shared shadcn tokens/components in `components/shared/ui`.

## Current surface status
- **Client portal**: Home/support/profile/consents/cases are live and wired to Supabase (`core.people`, `case_mgmt.case_management`, grants, activities). Appointments are backed by `portal.appointments` (request/reschedule/cancel flows audit + revalidate). Documents read from the `portal-attachments` bucket with 30‑minute signed URLs. Support composer queues notifications via `portal_queue_notification` + audit. Messages page is a placeholder; Home “focus areas” are static copy only.
- **Registration & public flows** (`/register/*`): Get help, existing-claim, community-member, partner, volunteer, and concern-report flows write to `portal.registration_flows` (rate-limited) and call `claim_registration_flow` when applicable.
- **Staff tools**: Caseload, schedule, and outreach log use RPCs `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`. Staff appointments surface uses `portal.appointments` with scoped filters and server actions (confirm/cancel/complete). Case detail/note/consent actions write to `core.people` and `core.people_activities`; intake queue reads `portal.registration_flows`. Tasks view is a placeholder.
- **Organization tools**: Members/invites/settings scoped by org via `set_profile_role` and RLS. Redirects if the profile lacks an org or approval.
- **Admin tools**:
  - Clients/consents/grants: `core.people`, `person_access_grants`, `get_people_list_with_types`.
  - Users/profiles/organizations: `portal.profiles`, `portal.profile_invites`, `set_profile_role`, `refresh_user_permissions`.
  - Resources/policies: TipTap editors persisting to `portal.resource_pages` and `portal.policies` (HTML sanitized).
  - Notifications: `portal.notifications` + optional `portal-alerts` invocation.
  - Marketing: `portal.public_settings` and related content powering the marketing site (admin/website + admin/marketing panels write here).
  - Inventory: `inventory` schema RPCs/views; Donations catalogue in `donations` schema linked to inventory items.
  - Service rules / warming room / templates pages are stubs—no backend yet; keep them guarded and add audit if you wire them.
- **Marketing integration**: Marketing site stays read-only; plan cache/tag/webhook invalidation so updates from STEVI admin propagate across apps.

## Development standards
- Use `createSupabaseServerClient` inside actions/route handlers to set auth cookies; the RSC client is read-only and should not set cookies.
- Keep routes dynamic unless truly static. Do not fetch roles client-side—pass `PortalAccess` down.
- Respect RLS and consent: verify policies with Supabase MCP before shipping; UI hiding is not security.
- Design system: stick to the shadcn token set in `src/styles/theme.css` and shared components; avoid ad-hoc colors/spacing.
- Notifications/alerts: send via `queuePortalNotification`; include `PORTAL_ALERTS_SECRET` locally only if you need to exercise the Edge Function.
- Testing: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run e2e` (Playwright). Few tests exist—add coverage when touching flows.
- Build/deploy: run `node build.js` (lints then builds with webpack + standalone output). Azure App Service consumes the generated `.next/standalone` output.
- Environment: `.env.example` exists; keep it aligned with `docs/backend.md`. Never commit secrets or the service-role key. Set `NEXT_PUBLIC_MARKETING_URL` when telemetry must accept a marketing host.

-## Updates — 2025-12-08
- Dual-shell split delivered: client routes live in `src/app/(client)` with `@client/client-shell` layout + `theme.client.css`; operations routes live in `src/app/(ops)` with `@workspace/shells/app-shell` + `theme.ops.css`.
- Guards centralized in `src/lib/portal-areas.ts` (`requireArea`, preview query parsing, landing resolution). Client preview requires `?preview=1`; ops shell rejects preview mode. Onboarding gating now only in the client layout.
- Navigation split: client nav in `src/lib/client-navigation.ts`; ops nav (no client links) in `src/lib/portal-navigation.ts`. Preview links now point to `/home?preview=1`.
- Components reorganized: `components/client`, `components/workspace`, `components/shared` (UI primitives now at `@shared/ui`). Shared providers/layout under `@shared/providers` / `@shared/layout`. Cancel appointment form at `@shared/appointments/cancel-appointment-form`.
- Path aliases added: `@client/*`, `@workspace/*`, `@shared/*`; ESLint `no-restricted-imports` enforces cross-shell boundaries. CODEOWNERS covers both shells.
- Docs: `docs/architecture/shells.md` documents the split and checklist; README updated accordingly; `plan.md` marked completed.
- Tests: Vitest suite updated for new guards; Playwright smoke updated to assert login redirects for client preview and workspace routes.
## Outstanding work (prioritised)
1. Wire the Messages page and staff Tasks view to real data (respect consent/RLS) and add audit trails.
2. Add cache revalidation/webhook strategy so marketing and STEVI stay in sync after admin content updates.
3. Metrics/governance/ops stubs (service rules, warming room, templates) need real data models, capability flags, and audit coverage if kept.
4. Flesh out App Service ops runbook (alerts, slot swap procedure) and keep `README.md`/`docs/backend.md` in sync with platform changes.
5. Increase automated coverage (Vitest + Playwright) for registration flows, consents, appointments/documents, notifications, inventory/donations.
6. Mirror or pipeline Supabase Edge Functions (`portal-alerts`, `portal-admin-invite`, etc.) into this repo or clearly document their external home.

## Tooling notes
- Default to Azure CLI for infra. Helpful context:
  - Subscription: **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`) is the only scope to touch. `az account show` should already reflect this.
  - Resource groups of interest: `IHARC_public_apps` (Front Door, App Service, DNS zone `iharc.ca`), `IHARC` (core data), `contact_centre` (separate). Front Door profile `IHARC-FD`, endpoint `iharc` (`iharc-hngcbedraxgtfggz.z03.azurefd.net`). App Service plan `IHARC-Linux` (Basic B1; scale to B2 if needed). Apps: `STEVI` (workspace shell, host `stevi.iharc.ca`), `IHARC-Login` (login shell). DNS zone `iharc.ca` lives in `IHARC_public_apps`.
  - Common commands: `az afd profile/list/route/origin/custom-domain`, `az webapp list/show/config access-restriction`, `az appservice plan show/update`, `az network dns zone/record-set cname`, `az account set --subscription IHARC-main-sub`.
- Use Context7 for library/API docs/codegen; use Supabase MCP for live schema/RLS inspection instead of guessing from migrations.
- No Azure MCP usage—run Azure operations directly via the CLI. 
