# STEVI Runtime Reference

This document captures the backend expectations for running the STEVI portal alongside IHARC’s existing Supabase project on Azure App Service.

## Platform Summary

- **Framework**: Next.js 16 (App Router, React 19). SSR and RSC are enabled; most routes force dynamic rendering to respect Supabase auth context.
- **Hosting**: Azure App Service (Linux, Node 24 LTS / 24.12.x) at `stevi.iharc.ca`, deployed via GitHub Actions workflow `.github/workflows/main_stevi.yml` using publish profiles.
- **Data Layer**: Shared Supabase project with the marketing site (`iharc.ca`) and STEVI OPS. Schemas of interest: `portal`, `core`, `case_mgmt`, `inventory`, `donations`.
- **Authentication**: Supabase OAuth Server (beta) with a dedicated consent UI on `login.iharc.ca`. `stevi.iharc.ca` stores OAuth access/refresh tokens in httpOnly cookies and uses them for RLS-scoped Supabase access.
- **Caching**: Next.js data cache only. We rely on `revalidatePath`/`revalidateTag` for targeted busting; no Edge CDN custom layer is configured yet.

## Environment Variables

Use `.env` (git-ignored) for local values and update the local override block when testing localhost flows. Default to `http://localhost:3000` for local dev; you can optionally use a split-host setup (`http://stevi.localhost:3000` + `http://login.localhost:3000`) to mirror production routing. All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Do not expose secrets such as the service-role key or the alerts secret.

Supabase Auth best practices for local dev:
- Keep the production `Site URL` on the hosted project, and add localhost callback URLs to the Auth redirect allowlist.
- If you need the OAuth consent UI to run locally, use a dedicated dev Supabase project (recommended) or temporarily point the Auth `Site URL` to your local login host while testing.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL shared with marketing + STEVI OPS. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase publishable key (JWT). Must match the marketing site to preserve session portability. |
| `SUPABASE_URL` | ✅ | Same as `NEXT_PUBLIC_SUPABASE_URL`, kept private in App Service for server actions. |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Same as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, kept private for server actions. |
| `SUPABASE_SERVICE_ROLE_KEY` | ☐ | Optional. Used for CLI scripts or local tooling; never ship to the client. |
| `PORTAL_ALERTS_SECRET` | ☐ | Bearer token for invoking the `portal-alerts` Edge Function (notifications queue). Leave unset to skip the function call locally. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical STEVI URL (`https://stevi.iharc.ca` in production). Used in auth redirects and sitemap metadata. |
| `NEXT_PUBLIC_LOGIN_URL` | ✅ | OAuth login/consent domain (`https://login.iharc.ca` in production). |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Marketing site root (`https://iharc.ca`). Fallback for shared utilities that need the public hostname. |
| `SUPABASE_OAUTH_CLIENT_ID` | ✅ | OAuth client ID registered in Supabase Auth → OAuth Server. |
| `SUPABASE_OAUTH_REDIRECT_URI` | ☐ | Optional override for OAuth redirect URI (defaults to `${NEXT_PUBLIC_APP_URL}/auth/callback`). |
| `SUPABASE_OAUTH_SCOPES` | ✅ | Space-delimited OAuth scopes (`openid email profile phone`). |
| `NEXT_PUBLIC_GA4_ID` | ☐ | GA4 measurement ID. Shared property with the marketing site unless outreach requests otherwise. |
| `NEXT_PUBLIC_ANALYTICS_DISABLED` | ☐ | Set to `true` to disable analytics output (defaults to `false`). Useful for local development or privacy reviews. |

OAuth server key requirements:
- `openid` scope requires Supabase Auth to use asymmetric JWT signing keys (ES256 preferred, RS256 acceptable).
- After key rotation, verify access/ID tokens via the JWKS endpoint (do not keep using the legacy JWT secret).

## Supabase Usage

- **Clients**: `createSupabaseRSCClient` and `createSupabaseServerClient` read OAuth access tokens from secure cookies. `createSupabaseAuthServerClient` is used only on `login.iharc.ca` to manage Supabase Auth sessions for the consent UI.
- **Schemas**:
  - `portal`: `profiles`, `profile_invites`, `profile_contacts`, `resource_pages`, `policies`, `notifications`, `public_settings`, `registration_flows`, `audit_log`.
  - `core`: `people`, `people_activities`, `person_access_grants`, `organizations`, org memberships, contact details.
  - `case_mgmt`: `case_management` (client cases).
  - `inventory`: `v_items_with_balances`, `locations`, and stock transactions.
  - `donations`: `catalog_items`, `catalog_item_metrics` (linked to inventory items).
  - Do **not** add tables without coordination; inspect production schema via Supabase MCP before shipping mutations.
- **RPC / Functions**:
  - `core.get_actor_global_roles`, `core.get_actor_org_roles`, `core.get_actor_org_permissions`, `core.get_actor_permissions_summary`
  - `portal_log_audit_event`, `portal_queue_notification`, `portal_check_rate_limit`, `portal_get_user_email`, `claim_registration_flow`, `get_people_list_with_types`.
  - Staff views: `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`.
  - Inventory RPCs: `receive_stock`, `receive_stock_with_source`, `transfer_stock`, `adjust_stock`, `update_transaction_source`.
  - Edge Function `portal-alerts` is invoked from `queuePortalNotification` when `PORTAL_ALERTS_SECRET` is configured. Keep the function source in the marketing repo until consolidated.
- **Admin tools**:
  - `/admin/profiles` calls `portal.profiles` and `portal.profile_invites` to approve or decline partner access, logging every decision through `portal_log_audit_event`.
  - Invitations originate from STEVI via `portal-admin-invite`; role assignments use the org/global role tables (no JWT refresh RPCs).
  - `/admin/notifications` queues outreach updates by invoking `portal_queue_notification` and surfaces delivery history from `portal.notifications`.
- **Storage**:
  - Secure documents live in the `portal-attachments` bucket (managed via Supabase storage policies).

## Authentication Expectations

- Login + consent live on `login.iharc.ca` using Supabase OAuth Server. Legacy login/register/reset flows have been removed; do **not** reintroduce back-compat shims.
- All server actions ensure the caller has a `portal.profiles` row. Use `ensurePortalProfile` before writing to sensitive tables.
- RLS is enforced on every table. Any new server action must be verified against production policies using Supabase MCP.

## Authorization & Role Separation

- `src/lib/portal-access.ts` is the single source of truth for portal authorization. It pulls role/permission context from `core.get_actor_*` RPCs (no JWT fallbacks) and derives capability flags (`canManageResources`, `canManagePolicies`, `canManageWebsiteContent`, `canManageNotifications`, `canManageOrgUsers/Invites`, `canAccessOpsFrontline`, `canAccessOpsOrg`, `canAccessOpsSteviAdmin`, etc.).
- Navigation, layouts, server pages, and server actions consume these capability flags—never raw role strings—to avoid drift and ensure UI/server parity.
- Inventory tooling still uses `ensureInventoryActor` on top of `PortalAccess` for IHARC-specific roles when needed.
- Marketing content, resource library, policies, and notifications are IHARC-global-admin only.
- Do not add new privileged routes without updating `portal-access.ts`; keep UI links, server guards, and Supabase RLS in sync to prevent privilege escalation.
- Client shell layout `src/app/(client)/layout.tsx` wraps portal routes with `PortalAccessProvider`, so client components can read `usePortalAccess()` without making extra Supabase calls. Prefer passing `portalAccess` from parents rather than fetching again.

### Adding a New Role or Privileged Feature (checklist)
1. **Supabase first**: Create/assign the role and permissions in Supabase (`core.permissions`, `core.role_templates`, `core.role_template_permissions`, `core.org_roles`, `core.org_role_permissions`, `core.user_org_roles`, `core.global_roles`, `core.user_global_roles`).
2. **Capability flag**: Add a boolean to `src/lib/portal-access.ts` that derives from the new role/permission (e.g., `canManageX`).
3. **UI & routing**: Gate new pages, server actions, and nav links using that capability flag. Add links via the unified nav config in `portal-navigation.ts` instead of hard-coding paths.
4. **RLS**: Ensure the target tables/RPCs enforce the same role in their policies. Never rely solely on UI hiding.
5. **Docs/tests**: Document the new capability in this section and add minimal tests/Playwright coverage if it introduces a new surface.

## Local Development

1. `npm install`
2. Update `.env` with the shared Supabase credentials (and localhost overrides when testing locally).
3. `npm run dev` to start Next.js locally (port 3000 by default).
4. Optional: set `NEXT_PUBLIC_ANALYTICS_DISABLED=true` while developing to silence GA scripts.

## Deployment Notes

- GitHub Actions workflow `.github/workflows/main_stevi.yml` builds with Node 24.12.0, runs `npm run build` (lint + Next build forced to webpack for standalone output), prunes dev dependencies, bundles the Next standalone output (`.next/standalone` + `.next/static` + `public`), and deploys via `azure/webapps-deploy@v3` using publish profiles. Use `workflow_dispatch` with `slot=staging` to target a staging slot when `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` is configured.
- App Service settings: set the environment variables above in App Settings (per slot). Keep `WEBSITE_NODE_DEFAULT_VERSION` aligned to Node 24 (24.12.x), and disable platform builds if you are deploying prebuilt artifacts (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`). The start script runs `node .next/standalone/server.js`.
- Revalidation currently relies on `revalidatePath`. When STEVI begins triggering marketing refreshes, introduce shared cache tags or webhook notifications so both apps stay in sync.
- Operational items now required on App Service (not handled automatically like SWA):
  - Enable `alwaysOn`, HTTP logging, and Application Insights with 5xx/latency alerts.
  - Bind custom domains and Managed Certificates per hostname.
  - Scale plan/instances based on observed CPU/memory; SWA’s serverless scaling no longer applies.

## Next Steps

- Wire the Messages page and staff Tasks view to real data (respect consent/RLS) and add audit trails.
- Add cache revalidation/webhook strategy so marketing and STEVI stay in sync after admin content updates.
