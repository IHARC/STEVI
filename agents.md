# STEVI Agent Briefing

## Ground rules
- CLI runs in workspace-write with restricted outbound network. Prefer MCP tools (Context7 for docs/codegen, Supabase MCP for schema/RLS) and repo sources; request approval before any internet call.
- Never add backward-compatibility shims, hidden fallbacks, or keep dead/legacy code. Ship clean, explicit fixes that honour IHARC’s trauma-informed, harm-reduction, and WCAG commitments (see marketing architecture doc referenced in the marketing repo).
- Supabase schema is shared across STEVI, STEVI OPS, and the marketing app—do not alter it without coordination. Verify policies via Supabase MCP, not migrations alone.
- Keep audit, privacy, and rate limits intact; every mutation should log to the audit trail and respect RLS/consent flags.

## Snapshot — 2025-11-25
- Product: STEVI (Supportive Technology to Enable Vulnerable Individuals) operated by IHARC (Northumberland County, ON, Canada).
- Stack: Next.js 16 (App Router, React 19, RSC), TypeScript, Tailwind with Material 3 tokens (`docs/design-tokens.md`), Radix primitives + shadcn-inspired wrappers, TipTap for rich text.
- Hosting/build: Azure App Service (Linux, Node 24). Build entry is `node build.js` (runs `eslint .` then `next build`) and deploys via GitHub Actions (`.github/workflows/main_stevi.yml`, publish-profile based). Marketing app deploys separately but shares the same Supabase project/env vars.
- Auth/session: Supabase Auth via `@supabase/ssr` cookies. Use `createSupabaseServerClient` in actions/route handlers (can set cookies); the RSC client is read-only. Most portal routes export `dynamic = 'force-dynamic'` to respect session + RLS.
- Data & storage: Supabase schemas in active use: `portal`, `core`, `case_mgmt`, `inventory`, `donations`. Storage bucket `portal-attachments`; Edge Function `portal-alerts` (invoked when `PORTAL_ALERTS_SECRET` is set).
- Caching: No custom CDN layer. Use `revalidatePath`/`revalidateTag` from server actions; avoid static rendering for authed content.

## Architecture & data flow
- Responsibility split: STEVI owns authenticated client/staff/admin surfaces and all writes. The marketing site consumes Supabase content read-only (public settings, resources, policies, donation catalogue, stats).
- Key tables:
  - `portal`: `profiles`, `profile_invites`, `profile_contacts`, `resource_pages`, `policies`, `notifications`, `public_settings`, `registration_flows`, `audit_log`.
  - `core`: `people`, `people_activities`, `person_access_grants`, `organizations`, org memberships, contact details.
  - `case_mgmt`: `case_management` (client cases).
  - `inventory`: `v_items_with_balances`, `locations`, stock transactions.
  - `donations`: `catalog_items`, `catalog_item_metrics` (linked to inventory items).
- RPCs / functions used today: `get_user_roles`, `portal_log_audit_event`, `portal_queue_notification` (+ `portal-alerts` Edge Function), `portal_check_rate_limit`, `portal_get_user_email`, `refresh_user_permissions`, `set_profile_role`, `claim_registration_flow`, `get_people_list_with_types`, `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`, inventory RPCs (`receive_stock`, `receive_stock_with_source`, `transfer_stock`, `adjust_stock`, `update_transaction_source`).
- Authorization: `PortalAccess` (`src/lib/portal-access.ts`) derives capability flags exclusively from `get_user_roles` + `ensurePortalProfile`. Never rely on JWT/app_metadata fallbacks or UI hiding alone.
- Audit/logging: Route every mutation through `logAuditEvent`; consent/person updates and grants already follow this pattern—keep it consistent.
- Rate limiting: `portal_check_rate_limit` backs the public/registration flows. Keep it in the loop when adding new anonymous endpoints.
- Content safety: sanitize TipTap/HTML using `sanitize-resource-html` and `sanitize-embed` before persisting.

## Navigation
- Unified navigation lives in `src/lib/portal-navigation.ts` with sections for client, staff, admin, and organization. It is role/approval-gated via existing `PortalAccess` flags—no mode switching.
- Admin access automatically sees staff tools; staff/admin can also see client links for preview.
- Best practice for new surfaces:
  1. Add/adjust a capability flag in `PortalAccess` if required (reusing existing roles/RLS; do not invent new workspace concepts).
  2. Add the link under the correct section/group in `portal-navigation.ts` with `requires` guards.
  3. Guard the page/server action with the same capability check and ensure Supabase RLS enforces it.
  4. Add cache invalidation/tagging as needed and update tests.
  5. Keep UI consistent with Material 3 tokens and shared components.

## Current surface status
- **Client portal**: Home/support/profile/consents/cases are live and wired to Supabase (`core.people`, `case_mgmt.case_management`, grants, activities). Appointments and documents still render placeholder data; requests log audit events but are not yet backed by scheduling/storage.
- **Registration & public flows** (`/register/*`): Get help, existing-claim, community-member, partner, volunteer, and concern-report flows write to `portal.registration_flows` (rate-limited) and call `claim_registration_flow` when applicable.
- **Staff tools**: Caseload, schedule, and outreach log use RPCs `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`. Case detail/note/consent actions write to `core.people` and `core.people_activities`; intake queue reads `portal.registration_flows`.
- **Organization tools**: Members/invites/settings scoped by org via `set_profile_role` and RLS. Redirects if the profile lacks an org or approval.
- **Admin tools**:
  - Clients/consents/grants: `core.people`, `person_access_grants`, `get_people_list_with_types`.
  - Users/profiles/organizations: `portal.profiles`, `portal.profile_invites`, `set_profile_role`, `refresh_user_permissions`.
  - Resources/policies: TipTap editors persisting to `portal.resource_pages` and `portal.policies` (HTML sanitized).
  - Notifications: `portal.notifications` + optional `portal-alerts` invocation.
  - Marketing: `portal.public_settings` and related content powering the marketing site.
  - Inventory: `inventory` schema RPCs/views; Donations catalogue in `donations` schema linked to inventory items.
- **Marketing integration**: Marketing app should stay read-only; plan cache/tag/webhook invalidation so updates from STEVI propagate across apps.

## Development standards
- Use `createSupabaseServerClient` inside actions/route handlers to set auth cookies; the RSC client is read-only and should not set cookies.
- Keep routes dynamic unless truly static. Do not fetch roles client-side—pass `PortalAccess` down.
- Respect RLS and consent: verify policies with Supabase MCP before shipping; UI hiding is not security.
- Design system: stick to Material 3 tokens and shared components; avoid ad-hoc colors/spacing. Regenerate tokens with `npm run sync:tokens` after updating `tokens/material3.json`.
- Notifications/alerts: send via `queuePortalNotification`; include `PORTAL_ALERTS_SECRET` locally only if you need to exercise the Edge Function.
- Testing: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run e2e` (Playwright). Few tests exist—add coverage when touching flows.
- Build/deploy: run `node build.js` (lints then builds). Azure App Service consumes the generated `.next` output.
- Environment: `.env.example` is currently missing—create it using the matrix in `docs/backend.md`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`. Optional: `PORTAL_ALERTS_SECRET`, GA. Never commit secrets.

## Outstanding work (prioritised)
1. Wire appointments and document locker to real Supabase tables/RPCs and `portal-attachments` signed URLs; add staff-side management to replace placeholders.
2. Add cache revalidation/webhook strategy so marketing and STEVI stay in sync after admin updates.
3. Metrics/governance surfaces (if still required) are not built—confirm scope, add capability flag, and align RLS.
4. Flesh out App Service ops runbook (alerts, slot swap procedure) and keep `README.md`/`docs/backend.md` in sync with platform changes.
5. Increase automated coverage (Vitest + Playwright) for registration flows, consents, cases, notifications, inventory/donations.
6. Mirror or pipeline Supabase Edge Functions (`portal-alerts`, `portal-admin-invite`, etc.) into this repo or clearly document their external home.

## Tooling notes
- Default to MCP. Use Context7 for any library/API documentation or codegen steps; use Supabase MCP to inspect live schema/RLS instead of guessing from migrations.
- MCP resources/templates are not configured—do not rely on them. Avoid outbound web requests unless approved.
