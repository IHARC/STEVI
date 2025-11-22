# STEVI Runtime Reference

This document captures the backend expectations for running the STEVI portal alongside IHARC’s existing Supabase project and Azure Static Web Apps deployment.

## Platform Summary

- **Framework**: Next.js 15 (App Router, React 19). SSR and RSC are enabled; most routes force dynamic rendering to respect Supabase auth context.
- **Hosting**: Azure Static Web Apps (`stevi.iharc.ca` in production). CI uses the Azure Static Web Apps build workflow.
- **Data Layer**: Shared Supabase project with the marketing site (`iharc.ca`) and STEVI OPS. Schemas of interest: `portal`, `core`, `inventory`, `justice`.
- **Authentication**: Supabase Auth session cookies managed via `@supabase/ssr`. The same supabase URL and publishable key must be used across all IHARC apps.
- **Caching**: Next.js data cache only. We rely on `revalidatePath`/`revalidateTag` for targeted busting; no Edge CDN custom layer is configured yet.

## Environment Variables

Copy `.env.example` to `.env` and fill the required values. All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Do not expose secrets such as the service-role key or the alerts secret.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL shared with marketing + STEVI OPS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Publishable Supabase key (JWT). Must match the marketing site to preserve session portability. |
| `SUPABASE_SERVICE_ROLE_KEY` | ☐ | Optional. Used for CLI scripts or local tooling; never ship to the client. |
| `PORTAL_ALERTS_SECRET` | ☐ | Bearer token for invoking the `portal-alerts` Edge Function (notifications queue). Leave unset to skip the function call locally. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical STEVI URL (`https://stevi.iharc.ca` in production). Used in auth redirects and sitemap metadata. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Marketing site root (`https://iharc.ca`). Fallback for shared utilities that need the public hostname. |
| `NEXT_PUBLIC_GA4_ID` | ☐ | GA4 measurement ID. Shared property with the marketing site unless outreach requests otherwise. |
| `NEXT_PUBLIC_ANALYTICS_DISABLED` | ☐ | Set to `true` to disable analytics output (defaults to `false`). Useful for local development or privacy reviews. |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | ☐ | Required by the deployment pipeline to trigger SWA previews. Omit for local dev. |

## Supabase Usage

- **Clients**: `createSupabaseClient`, `createSupabaseRSCClient`, and `createSupabaseServerClient` mirror the marketing app. They rely exclusively on the publishable anon key and shared cookies for auth continuity.
- **Schemas**:
  - `portal.profiles`, `portal.profile_invites`, `portal.resource_pages`, `portal.notifications` handle most portal data.
  - `portal.registration_flows` stores all public registration submissions (client intakes, claims, partner/volunteer applications, concern reports). See `docs/portal/registration.md` for details.
  - `portal.volunteer_*` now holds all volunteer metadata (profiles, roles, statuses, activities, verify tokens). The legacy `admin` schema has been removed; route all volunteer onboarding/reporting to `portal` tables.
  - We do **not** create new tables without coordination; use Supabase MCP to inspect the live schema before shipping mutations.
- **RPC / Functions**:
  - `portal_log_audit_event`, `portal_queue_notification`, and `portal_refresh_profile_claims` are key RPCs already in use.
  - Edge Function `portal-alerts` is invoked from `queuePortalNotification` when `PORTAL_ALERTS_SECRET` is configured. Keep the function source in the marketing repo until we consolidate deployment tooling.
- **Admin workspaces**:
  - `/admin/profiles` calls `portal.profiles`, `portal.profile_invites`, and `portal_refresh_profile_claims` to approve or decline partner access, logging every decision through `portal_log_audit_event`.
  - Invitations now originate from STEVI via the `portal-admin-invite` Edge Function, keeping Supabase audit trails intact.
  - `/admin/notifications` queues outreach updates by invoking `portal_queue_notification` and surfaces delivery history from `portal.notifications`.
- **Storage**:
  - Secure documents live in the `portal-attachments` bucket (managed via Supabase storage policies).

## Authentication Expectations

- Login, registration, and password reset flows exactly mirror `I.H.A.R.C-Public-Website`. Do **not** change the Supabase auth providers or session management without consulting the marketing + OPS maintainers.
- All server actions ensure the caller has a `portal.profiles` row. Use `ensurePortalProfile` before writing to sensitive tables.
- RLS is enforced on every table. Any new server action must be verified against production policies using Supabase MCP.

## Authorization & Role Separation

- `src/lib/portal-access.ts` centralizes portal access checks. It loads the Supabase user session, the matching `portal.profiles` row, and any IHARC-specific roles stored in `app_metadata.claims.roles`. Only roles issued through Supabase server-side app metadata are trusted.
- Navigation and menus call `loadPortalAccess` server-side, so clients never receive menu links for admin or staff-only surfaces unless their profile role (moderator/admin) or IHARC role permits it. The UI now mirrors the same rules enforced by server actions.
- Inventory tooling relies on the same helper plus `ensureInventoryActor` so outreach staff with IHARC roles can reach `/admin/inventory` without granting them full portal moderator access.
- Do not add new privileged routes without updating `portal-access.ts` — this keeps UI, server actions, and documentation aligned and prevents accidental privilege escalation in future features.
- `(portal)/layout.tsx` now wraps every portal route with `PortalAccessProvider`, so any client component can call `usePortalAccess()` when it needs the authenticated profile, feature gates, or IHARC role list without triggering its own Supabase round-trip. Prefer plumbing access data from this provider before hitting Supabase again.

## Local Development

1. `npm install`
2. Copy `.env.example` to `.env` and provide the shared Supabase credentials.
3. `npm run dev` to start Next.js locally (port 3000 by default).
4. Optional: set `NEXT_PUBLIC_ANALYTICS_DISABLED=true` while developing to silence GA scripts.

## Deployment Notes

- Azure SWA builds run `npm run build` (see `build.js` for the custom entry that swaps to `next build`). Ensure the environment variables above are configured in the SWA dashboard.
- Revalidation currently relies on `revalidatePath`. When STEVI begins triggering marketing refreshes, introduce shared cache tags or webhook notifications so both apps stay in sync.
- `AZURE_STATIC_WEB_APPS_API_TOKEN` is only needed for CI/CD pipelines that call the SWA management APIs. Keep this secret in the GitHub Action / Azure environment, not in `.env`.

## Next Steps

- Phase 2 will wire the appointments and document lockers to real Supabase tables.
- Phase 3 will migrate profile verification, notifications, and metrics admin tooling into STEVI while maintaining read-only access for the marketing site.
