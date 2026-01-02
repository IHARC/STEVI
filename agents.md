# STEVI Codex Agent Guide
Last updated: 2026-01-02  
Status: Working guide (expect frequent edits)

STEVI (Supportive Technology to Enable Vulnerable Individuals) is IHARC’s multi‑tenant portal for clients, outreach staff, and partner organizations in Northumberland County, Ontario, Canada.

Environment constraints (sandboxing, network access, approvals) are set by the Codex harness. Check the session environment context before assuming network access. MCP resources and resource templates are not configured for this repo.

Use `mcp__augment-context-engine__codebase-retrieval` to streamline codebase searches.

## Product + users
- IHARC (Integrated Homelessness & Addictions Response Centre) develops and operates STEVI.
- Stakeholder groups the app supports:
  - **IHARC Admins**: super admins for the entire app. Primary admin: Jordan@iharc.ca.
  - **IHARC Staff & Volunteers**: role‑scoped operational users (inventory, client mgmt, outreach, intakes, etc.).
  - **Organizations**: sub‑tenants (foodbank, outreach non‑profits, etc.) enabling continuum of care with client consent.
  - **Organization Admins / Users**: managed within each org; similar capabilities to IHARC staff but tenant‑scoped.
  - **Clients**: control what is shared via consent; use a client portal for appointments, plans, documents, and support.

## Ground rules (non‑negotiable)
- Use Azure CLI for all infra/state checks (Front Door, App Service, DNS). Subscription is **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`) and is the only scope to touch.
- Treat this repo + generated Supabase types as source of truth. If older docs (marketing repo, Notion, etc.) disagree, defer to the code/schema and call out the mismatch.
- Never add backward‑compatibility shims, hidden fallbacks, or keep dead/legacy code. Ship clean, explicit fixes aligned with IHARC privacy/audit expectations and WCAG commitments (see the marketing architecture doc in the marketing repo for WCAG guidance).
- Supabase schema is shared across STEVI, STEVI OPS, and marketing—do not alter it without coordination. All schema changes must use Supabase MCP; never infer live state from migrations alone.
- Keep audit, privacy, and rate limits intact. Every mutation must log to the audit trail and respect RLS + consent flags.

## Snapshot (high-level)
- **Stack**: Next.js 16 App Router + server actions (React 19), TypeScript, Tailwind + shadcn/ui tokens from `src/styles/theme.css`, Radix primitives, TipTap for rich text.
- **Hosting/build**: Azure App Service (Linux, Node 24). `npm run build` → `node build.js` (runs `eslint .`, forces webpack via `NEXT_FORCE_WEBPACK=1`, emits `.next/standalone`, copies static into `.next/standalone/.next/static`). GitHub Actions `.github/workflows/main_stevi.yml` deploys via publish profiles. Runtime: `node .next/standalone/server.js`.
- **Auth/session**: Supabase OAuth Server (beta). `stevi.iharc.ca` uses OAuth access/refresh tokens stored in httpOnly cookies via `createSupabaseServerClient` + `createSupabaseRSCClient`. `login.iharc.ca` uses `createSupabaseAuthServerClient` to manage Supabase Auth cookies for the consent UI. Proxy (`/proxy.ts`) refreshes OAuth tokens; no legacy cookie fallbacks remain. Most authed routes export `dynamic = 'force-dynamic'`.
- **Caching**: No custom CDN layer. Use `revalidatePath`/`revalidateTag` from server actions; avoid static rendering for authed content.
- **Environment**: canonical list lives in `.env.example` + `docs/backend.md` (don't duplicate var lists here). Never commit secrets.

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

## Docs (source of truth)
- Docs index (start here): `docs/README.md`
- “What exists right now?” (routes + inventory): `docs/app-map.md`
- Vision/roadmaps: `docs/client-record-vision-roadmap.md`, `docs/encounter-module-vision-roadmap.md`
- Scenarios (canon acceptance flows): `docs/Scenarios/README.md`
- Use cases + user stories backlog: `docs/use-cases.md`

## Supabase (MCP‑only standard)
Use Supabase MCP tools exclusively for database work. CLI guidance does not apply here.

### New Codex session checklist (if DB work is involved)
- Run live checks with MCP:
  - `list_migrations` (what the DB has applied)
  - `list_tables` (what exists in target schemas)
  - `execute_sql` for precise inspection (RLS in `pg_policies`, functions in `pg_proc`, views in `pg_views`)
- Never infer DB state from repo migrations alone.

### Making DB changes
- **DDL only**: use `apply_migration` (tables, RLS, views, functions).
- **Data/inspection only**: use `execute_sql`.
- After schema changes, run `generate_typescript_types`.
- Run `get_advisors` after significant DDL for security/perf notices.

### Schema drift handling
- If the database was changed outside Codex, manually author a migration that matches the live DB, then apply it with `apply_migration` so repo and DB stay in sync.

### RLS standard
- Always verify policies in `pg_policies` after changes.
- Ensure views do not bypass RLS (use `security_barrier` or `security_invoker` as appropriate).

### Migration hygiene
- Do **not** delete migrations.
- If clutter becomes an issue, archive old migrations in-repo (e.g., `supabase/migrations/archive/`), but keep them in git.

### Authorization model
- `PortalAccess` (`src/lib/portal-access/index.ts`) derives capability flags from Supabase RPCs (`core.get_actor_global_roles`, `core.get_actor_permissions_summary`, `core.get_actor_org_roles`, `core.get_actor_org_permissions`) plus `ensurePortalProfile`. Never rely on JWT/app_metadata fallbacks or UI hiding alone.

### Audit/rate limits
- Route every mutation through `logAuditEvent`.
- Public/registration flows must call `portal_check_rate_limit`.

### Content safety
- Sanitize TipTap/HTML with `sanitize-resource-html` and `sanitize-embed` before persisting.

## Development standards
- Use `createSupabaseServerClient` in actions/route handlers; never set cookies from RSC client.
- Proxy is for lightweight token refresh + security headers only; authorization belongs in server actions/route handlers/data access.
- Do not use `supabase.auth.getSession()` on the server; use `getUser()`/`getClaims()` instead.
- Always use the Supabase publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`); never re‑introduce `*_ANON_KEY`.
- Keep routes dynamic unless truly static. Do not fetch roles client‑side; compute `PortalAccess` on the server and pass down.
- Verify RLS/consent with Supabase MCP before shipping; UI hiding is not security.
- Stay inside the shadcn token system in `src/styles/theme.css`; no ad‑hoc colors/spacing.
- Notifications: send via `queuePortalNotification`. Use `PORTAL_ALERTS_SECRET` locally only when exercising the Edge Function.
- Commands: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run e2e` (Playwright).
- Keep `.env.example` aligned with `docs/backend.md`. Never commit `SUPABASE_SERVICE_ROLE_KEY`.

## Active plans (canon)
- Docs index (start here): `docs/README.md`
- Client record foundation: `docs/client-record-vision-roadmap.md`
- Encounter module: `docs/encounter-module-vision-roadmap.md`
- Use cases + scenarios: `docs/use-cases.md`, `docs/Scenarios/README.md`

## Tooling notes
- Default to Azure CLI for infra:
  - Subscription: **IHARC-main-sub** (`cc2de7f0-1207-4c5a-ab0e-df2cd0a57ab7`).
  - Resource groups: `IHARC_public_apps` (Front Door, App Service, DNS `iharc.ca`), `IHARC` (core data), `contact_centre` (separate).
  - Front Door: profile `IHARC-FD`, endpoint `iharc` (`iharc-hngcbedraxgtfggz.z03.azurefd.net`).
  - App Service plan `IHARC-Linux` (B1; scale to B2 if needed). Apps: `STEVI` (`stevi.iharc.ca`), `IHARC-Login`.
  - Common commands: `az afd profile/list/route/origin/custom-domain`, `az webapp list/show/config access-restriction`, `az appservice plan show/update`, `az network dns zone/record-set cname`, `az account set --subscription IHARC-main-sub`.
- Use Context7 for library docs/codegen; use Supabase MCP for live schema/RLS inspection.
