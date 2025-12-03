# STEVI Runtime Reference

This document captures the backend expectations for running the STEVI portal alongside IHARC’s existing Supabase project on Azure App Service.

## Platform Summary

- **Framework**: Next.js 16 (App Router, React 19). SSR and RSC are enabled; most routes force dynamic rendering to respect Supabase auth context.
- **Hosting**: Azure App Service (Linux, Node 24 LTS) at `stevi.iharc.ca`, deployed via GitHub Actions workflow `.github/workflows/main_stevi.yml` using publish profiles.
- **Data Layer**: Shared Supabase project with the marketing site (`iharc.ca`) and STEVI OPS. Schemas of interest: `portal`, `core`, `case_mgmt`, `inventory`, `donations`.
- **Authentication**: Supabase Auth session cookies managed via `@supabase/ssr`. The same Supabase URL and publishable key must be used across all IHARC apps.
- **Caching**: Next.js data cache only. We rely on `revalidatePath`/`revalidateTag` for targeted busting; no Edge CDN custom layer is configured yet.

## Environment Variables

Copy `.env.example` to `.env` and fill the required values. All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Do not expose secrets such as the service-role key or the alerts secret.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL shared with marketing + STEVI OPS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Publishable Supabase key (JWT). Must match the marketing site to preserve session portability. |
| `SUPABASE_URL` | ✅ | Same as `NEXT_PUBLIC_SUPABASE_URL`, kept private in App Service for server actions. |
| `SUPABASE_ANON_KEY` | ✅ | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`, kept private for server actions. |
| `SUPABASE_SERVICE_ROLE_KEY` | ☐ | Optional. Used for CLI scripts or local tooling; never ship to the client. |
| `PORTAL_ALERTS_SECRET` | ☐ | Bearer token for invoking the `portal-alerts` Edge Function (notifications queue). Leave unset to skip the function call locally. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical STEVI URL (`https://stevi.iharc.ca` in production). Used in auth redirects and sitemap metadata. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Marketing site root (`https://iharc.ca`). Fallback for shared utilities that need the public hostname. |
| `NEXT_PUBLIC_GA4_ID` | ☐ | GA4 measurement ID. Shared property with the marketing site unless outreach requests otherwise. |
| `NEXT_PUBLIC_ANALYTICS_DISABLED` | ☐ | Set to `true` to disable analytics output (defaults to `false`). Useful for local development or privacy reviews. |

## Supabase Usage

- **Clients**: `createSupabaseClient`, `createSupabaseRSCClient`, and `createSupabaseServerClient` mirror the marketing app. They rely exclusively on the publishable anon key and shared cookies for auth continuity.
- **Schemas**:
  - `portal`: `profiles`, `profile_invites`, `profile_contacts`, `resource_pages`, `policies`, `notifications`, `public_settings`, `registration_flows`, `audit_log`.
  - `core`: `people`, `people_activities`, `person_access_grants`, `organizations`, org memberships, contact details.
  - `case_mgmt`: `case_management` (client cases).
  - `inventory`: `v_items_with_balances`, `locations`, and stock transactions.
  - `donations`: `catalog_items`, `catalog_item_metrics` (linked to inventory items).
  - Do **not** add tables without coordination; inspect production schema via Supabase MCP before shipping mutations.
- **RPC / Functions**:
  - `get_user_roles`, `portal_log_audit_event`, `portal_queue_notification`, `portal_check_rate_limit`, `portal_get_user_email`, `refresh_user_permissions`, `set_profile_role`, `claim_registration_flow`, `get_people_list_with_types`.
  - Staff views: `core.staff_caseload`, `core.staff_shifts_today`, `core.staff_outreach_logs`.
  - Inventory RPCs: `receive_stock`, `receive_stock_with_source`, `transfer_stock`, `adjust_stock`, `update_transaction_source`.
  - Edge Function `portal-alerts` is invoked from `queuePortalNotification` when `PORTAL_ALERTS_SECRET` is configured. Keep the function source in the marketing repo until consolidated.
- **Admin workspaces**:
  - `/admin/profiles` calls `portal.profiles`, `portal.profile_invites`, and `refresh_user_permissions` to approve or decline partner access, logging every decision through `portal_log_audit_event`.
  - Invitations originate from STEVI via `portal-admin-invite`; approvals refresh permissions via `refresh_user_permissions`.
  - `/admin/notifications` queues outreach updates by invoking `portal_queue_notification` and surfaces delivery history from `portal.notifications`.
- **Storage**:
  - Secure documents live in the `portal-attachments` bucket (managed via Supabase storage policies).

## Authentication Expectations

- Login, registration, and password reset flows exactly mirror `I.H.A.R.C-Public-Website`. Do **not** change the Supabase auth providers or session management without consulting the marketing + OPS maintainers.
- All server actions ensure the caller has a `portal.profiles` row. Use `ensurePortalProfile` before writing to sensitive tables.
- RLS is enforced on every table. Any new server action must be verified against production policies using Supabase MCP.

## Authorization & Role Separation

- `src/lib/portal-access.ts` is the single source of truth for portal authorization. It pulls roles from the Supabase RPC `get_user_roles(user_uuid)` (no JWT fallbacks) and derives capability flags (`canManageResources`, `canManagePolicies`, `canManageWebsiteContent`, `canManageNotifications`, `canManageOrgUsers/Invites`, `canAccessAdminWorkspace`, etc.).
- Navigation, layouts, server pages, and server actions consume these capability flags—never raw role strings—to avoid drift and ensure UI/server parity.
- Inventory tooling still uses `ensureInventoryActor` on top of `PortalAccess` for IHARC-specific roles when needed.
- Do not add new privileged routes without updating `portal-access.ts`; keep UI links, server guards, and Supabase RLS in sync to prevent privilege escalation.
- `(portal)/layout.tsx` wraps every portal route with `PortalAccessProvider`, so client components can read `usePortalAccess()` without making extra Supabase calls. Prefer passing `portalAccess` from parents rather than fetching again.

### Adding a New Role or Privileged Feature (checklist)
1. **Supabase first**: Create/assign the role and permissions in Supabase (`core.roles`, `core.permissions`, `core.role_permissions`, `core.user_roles`). Update any role-granting RPCs if needed.
2. **Capability flag**: Add a boolean to `src/lib/portal-access.ts` that derives from the new role/permission (e.g., `canManageX`).
3. **UI & routing**: Gate new pages, server actions, and nav links using that capability flag. Add links via the workspace blueprints in `portal-access.ts` instead of hard-coding paths.
4. **RLS**: Ensure the target tables/RPCs enforce the same role in their policies. Never rely solely on UI hiding.
5. **Docs/tests**: Document the new capability in this section and add minimal tests/Playwright coverage if it introduces a new surface.

## Local Development

1. `npm install`
2. Copy `.env.example` to `.env.local` (or `.env`) and provide the shared Supabase credentials.
3. `npm run dev` to start Next.js locally (port 3000 by default).
4. Optional: set `NEXT_PUBLIC_ANALYTICS_DISABLED=true` while developing to silence GA scripts.

## Deployment Notes

- GitHub Actions workflow `.github/workflows/main_stevi.yml` builds with Node 24, runs `npm run build` (lint + Next build), prunes dev dependencies, bundles `.next`, `public`, and `node_modules`, and deploys via `azure/webapps-deploy@v3` using publish profiles. Use `workflow_dispatch` with `slot=staging` to target a staging slot when `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` is configured.
- App Service settings: set the environment variables above in App Settings (per slot). Keep `WEBSITE_NODE_DEFAULT_VERSION` aligned to Node 24, and disable platform builds if you are deploying prebuilt artifacts (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`).
- Revalidation currently relies on `revalidatePath`. When STEVI begins triggering marketing refreshes, introduce shared cache tags or webhook notifications so both apps stay in sync.

## Next Steps

- Phase 2 will wire the appointments and document lockers to real Supabase tables.
- Phase 3 will migrate profile verification, notifications, and metrics admin tooling into STEVI while maintaining read-only access for the marketing site.
