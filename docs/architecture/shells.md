# Dual Shell Architecture

This document codifies the client/operations shell split for STEVI. It complements the detailed execution notes in `plan.md` and the background in `docs/client-workspace-shell-separation-plan.md`.

## Intent
- Isolate the client experience from staff/admin/org tooling while keeping a single Next.js app and host.
- Remove legacy/unified navigation and layout coupling so future changes stay within their shell.
- Enforce boundaries in code (directory structure, lint rules, path aliases) and at runtime (layout guards + `requireArea`).

## Route & Layout Map
- `(client)` route group: `/home`, `/messages`, `/appointments`, `/documents`, `/support`, `/resources`, `/cases`, `/profile`, `/onboarding` (+ supporting client-only routes).
- `(ops)` route group: `/ops/*` (frontline), `/ops/org/*` (tenant org hub), `/ops/hq/*` (STEVI Admin) plus shared ops primitives (command palette, inbox, navigation).
- `/login`, `/register/*`, `/reset-password` remain outside shell groups.
- Each group owns its layout, theme token file, and navigation surface; no shared chrome between shells.

## Component Boundaries
- `src/components/client/**` – client shell UI and hooks.
- `src/components/workspace/**` – operations UI and hooks (frontline, org, STEVI Admin).
- `src/components/shared/**` – primitives, providers, and cross-shell utilities (including shadcn/ui).
- Lint rules block imports from the opposite shell; shared + `src/lib/**` stay allowed for both.
- Path aliases:
  - `@client/*` → `src/components/client/*`
  - `@workspace/*` → `src/components/workspace/*`
  - `@shared/*` → `src/components/shared/*`

## Guards & Preview
- `requireArea(access, area, options)` centralizes shell authorization and preview handling.
- Client shell:
  - Normal access for client users.
  - Preview allowed only with `?preview=1` when the user has ops access.
  - Otherwise redirect to the ops landing path.
  - Onboarding enforced in the client layout (redirect to `/onboarding?next=...` when incomplete).
- Operations shell:
  - Areas: `ops_frontline`, `ops_org`, `ops_hq` (STEVI Admin).
  - Redirects to `/home` when ops access is missing.
  - Navigation contains only ops sections; primary chrome uses a thin hub rail (Today, Clients, Programs, Supplies, Partners, Org Hub, STEVI Admin) with sub-pages living inside each hub.
  - “Preview client portal” points to `/home?preview=1`.
- Preview banner lives only in the client shell with an explicit exit path back to the user’s primary ops area.
- Ops users manage their profile at `/ops/profile`; the client shell keeps `/profile` for client users and preview-only browsing. Shared form components live under `components/shared/profile`.

## Theming
- Shell-specific token files (`src/styles/theme.client.css`, `src/styles/theme.ops.css`) overlay the shared base tokens from `src/styles/theme.css`.
- Layout roots apply a `client-shell` or `ops-shell` class to scope the overrides.

## Testing Expectations
- Lint: `npm run lint -- --max-warnings=0` (import boundaries + heading class rule).
- Unit: `npm run test` (Vitest) covers navigation visibility, `requireArea`, and guard redirects.
- E2E: `npm run e2e` (Playwright) smoke per shell (client header/support button; ops command palette + absence of client nav; preview banner flow).

## Migration Checklist
1. Move client routes into `(client)` and operations routes into `(ops)`; delete unified `(portal)` layout.
2. Relocate components into `components/client`, `components/workspace`, or `components/shared`; update imports to new aliases.
3. Apply shell themes and add layout-level guards using `requireArea`.
4. Update navigation: client-only nav for `(client)`, ops-only nav for `(ops)`; preview link → `/home?preview=1`.
5. Update `middleware.ts`/`resolveLandingPath` to leverage `requireArea`.
6. Run lint, typecheck, Vitest, and Playwright smoke; fix any boundary or guard regressions.
7. Deploy as a single app service; no legacy redirects or compatibility shims.

## Rollback Notes
- Revert the route-group moves and layout replacements in a single commit to restore the prior unified shell.
- If preview/guard behavior regresses, disable `requireArea` in the layouts first, then reintroduce after verification.
- Keep Supabase schema untouched; no DB migrations are part of this split.

## References
- `plan.md` (execution tasks)
- `docs/client-workspace-shell-separation-plan.md`
- `docs/navigation-ownership.md` (navigation ownership note; supersedes the legacy unified shell doc)
