# Dual-Shell Separation Plan (Client vs Staff/Admin/Org)

**Status: Completed — 2025-12-08**

All work items below have been implemented in the codebase. The client and workspace shells now live in separate route groups with isolated layouts, themes, navigation, guards, and lint boundaries. See `docs/architecture/shells.md` for the finalized architecture notes and migration checklist.

This plan keeps a single Next.js app + single App Service/Front Door origin while fully separating the client UI from the workspace UI (staff/admin/org). It is a clean cut-over—no fallbacks, shims, legacy paths, or temporary backwards-compatibility routes. Legacy code is removed rather than retained.

## Context / Why
- Current single-shell approach (shared layout, unified nav, shared guards) allows accidental cross-exposure of client and staff/admin/org features, increases regression risk, and slows Codex-assisted development because changes routinely touch intertwined code paths.
- Path/role-based gating alone has proven insufficient; we need structural isolation (distinct route groups, layouts, themes, and import boundaries) to stop bleed-through and make reviews/test coverage meaningful.
- Keeping one deployable (vs. separate App Services) preserves existing session cookies, avoids duplicate pipelines, and keeps preview links seamless—lowest-friction change that still delivers isolation.
- Parenthesized Next.js route groups `(client)` and `(workspace)` are an App Router best practice for logical segmentation without URL or bundle side effects; they let us enforce per-shell layouts/guards while retaining current paths.

## What Exists (audit)
- Single app entry with shared layout: `src/app/layout.tsx`; security headers via `middleware.ts`.
- Auth/session: Supabase SSR (`src/lib/supabase/middleware.ts`, `src/lib/supabase/rsc.ts`). Cookies are scoped to the single host; no host-based logic.
- Routing: one route group `(portal)` that serves all areas (client, staff, admin, org) through `src/app/(portal)/layout.tsx`. Path-based landing (`src/app/page.tsx`) redirects unauthenticated users to `/login`, and authenticated users to `/admin|/staff|/org|/home` per `resolveLandingPath`.
- Navigation/source of truth: `src/lib/portal-navigation.ts` contains client + staff + admin + org sections; `AppShell` renders a unified nav.
- Docs already describing desired split but not implemented: `docs/client-workspace-shell-separation-plan.md`, `docs/unified-navigation.md` (still assumes unified nav).
- No use of `SHELL` env var, `CLIENT_COOKIE_DOMAIN`, or host-based routing—only path/role-based gating is in use.

## Goals
- Separate UIs: client shell and workspace shell (staff/admin/org) have distinct layouts, themes, and components, but share primitives/libs.
- Prevent feature bleed: guard each shell at the layout boundary and via lint boundaries so future changes stay isolated.
- Preserve simplicity: one build, one deploy, one host; URLs can be changed freely—no need to preserve legacy paths.
- No backward compatibility: remove legacy code and routes outright; do not keep parallel implementations or toggleable shims.

## Design Decisions
- Path-based shells, not host-based (keeps single session domain and simpler ops).
- Two route groups:
  - `src/app/(client)` – client-facing pages (home, messages, appointments, documents, support, onboarding if applicable).
  - `src/app/(workspace)` – staff/admin/org surfaces (existing `/staff`, `/admin`, `/org`, inbox/command palette, etc.).
- Per-shell layouts with their own chrome/theme; shared providers only at the primitive layer (`src/components/ui`, `src/lib/*`).
- Authorization enforced in layouts + server actions with a shared helper (e.g., `requireArea`), aligned with Supabase RLS.
- Keep Front Door/App Service as-is; scale plan to B2 (or P1v3 later) if needed—no multi-app split.

## Work Plan
1) **Prep & alignment**
   - Add `docs/architecture/` (new dir) and author `docs/architecture/shells.md` linking to this plan and `docs/client-workspace-shell-separation-plan.md`.
   - Normalize directories for linting: workspace shell UI lives under `components/workspace/**`; client shell UI under `components/client/**`; shared primitives under `components/shared/**`.
   - Add ESLint boundary rule: forbid imports between `components/client/**` and `components/workspace/**`; allow `components/shared/**` and `lib/**`.
   - Add CODEOWNERS entries assigning reviewers for `components/client/**` and `components/workspace/**` to reinforce reviews.
   - Add TS path aliases `@client/*`, `@workspace/*`, and `@shared/*` and update tsconfig/vitest/eslint resolvers; enforce with `no-restricted-imports` to prevent cross-shell pulls.

2) **Create route groups & layouts**
   - Add `src/app/(client)/layout.tsx` with client-only header/footer/theme; include the Portal layout context (or a client-scoped equivalent) so preview-aware components (`ClientPreviewBanner`, `ClientPreviewGuard`, support composer) keep working without cross-shell providers.
   - Add onboarding gating to the client layout (port existing check from `(portal)/layout.tsx`); unapproved users must be redirected to onboarding—no silent rendering.
   - Add `src/app/(workspace)/layout.tsx` by moving current `(portal)/layout.tsx` and adjusting imports.
   - Root `/` keeps redirect logic; `/login` stays outside groups.
   - Use Next.js route-group parentheses `(client)` / `(workspace)`; this is first-class in App Router and does not affect URLs, bundling, or middleware resolution when layouts are defined at the group root (modern best practice for isolated shells).

3) **Move client pages into (client)**
   - Relocate `/home`, `/messages`, `/appointments`, `/documents`, `/support` (and related public/onboarding flows if needed) under `(client)`.
   - Update imports to use client shell components and the client layout context; delete any residual dependency on workspace-only providers/components.

4) **Workspace shell tightening**
   - Keep `/staff/*`, `/admin/*`, `/org/*` under `(workspace)` with existing navigation, inbox, and command palette.
   - Remove client section from `portal-navigation.ts`; workspace nav shows only staff/admin/org.

5) **Guards**
   - Implement `requireArea(access, area)` used by both layouts and server actions/route handlers.
   - Client layout: allow client users; allow preview when `preview=1` and user has staff/admin/org access; otherwise redirect to workspace landing. No implicit fallbacks—fail closed.
   - Workspace layout: require staff/admin/org access; otherwise redirect to `/home`. No cross-shell rendering.

6) **Theming & UX split**
   - Add shell-specific theme tokens (e.g., `styles/theme.client.css`, `styles/theme.workspace.css` or TS token modules) applied at layout root.
   - Client shell UI components live under `components/client/*`; workspace UI lives under `components/workspace/*`; primitives under `components/shared/*`.
   - Shell-specific state/hooks live with their shell (e.g., `components/client/hooks/*`, `components/workspace/hooks/*`) to avoid shared hook bleed.

7) **Preview & cross-links**
   - Workspace top nav/user menu: single “Preview client portal” link to `/home?preview=1`.
   - Client layout shows a preview banner with exit link back to resolved workspace landing.

8) **Testing**
   - Vitest: add nav/guard unit tests (client section absent from workspace nav; guards redirect appropriately).
   - Playwright: smoke per shell (client header links + support button; workspace command palette + absence of client nav; preview banner flow).
   - Add lint tests (eslint --max-warnings=0) to ensure path-alias and import-boundary rules stay enforced.

9) **Cleanup (no back-compat)**
   - Remove any leftover client-specific imports from workspace shell.
   - Do not add legacy redirects or shims; remove or rename paths as needed and let removed routes 404.
   - Update `middleware.ts`/`resolveLandingPath` to delegate through `requireArea` so future routes cannot bypass shell checks.
   - Add a migration checklist to `docs/architecture/shells.md` (what moves, how to test, rollback steps) to make the refactor repeatable.

## Dev Ergonomics & Safety Rails
- Lint rule + `no-restricted-imports` to block cross-shell imports; TS path aliases to make intent explicit.
- Clear directories: `components/client`, `components/workspace`, `components/shared`; shell-specific hooks live under each shell.
- ADR/update: summarize boundaries and link to plan in `README` and `docs/architecture/shells.md`.
- CODEOWNERS coverage for each shell to enforce review discipline.

## Risks / Mitigations
- Risk: Missing guard on a new page → Mitigate with `requireArea` helper + linted test cases; no soft fallbacks.
- Risk: Theme drift → Scope CSS variables per layout and keep shared primitives neutral.
- Risk: Path churn late in the sprint → Coordinate QA on renamed routes; no legacy redirects will exist.

## Open Questions
- Should onboarding flows (`/register/*`, `/onboarding`) live in the client shell? (Default yes unless staff needs them.)
- Do we need a minimal offline banner/support strip in client shell (requested earlier but not implemented)?

## Out of Scope
- Multi-origin/host deployments or multiple App Services (not needed for this split).
- Converting to host-based routing or using `SHELL` env vars (kept path/role-based).
