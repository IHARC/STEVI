# STEVI Agent Briefing

## Mission Snapshot
- **Product name**: STEVI — Supportive Technology to Enable Vulnerable Individuals.
- **Operator**: IHARC (Integrated Homelessness & Addictions Response Centre), a non-profit serving people experiencing homelessness and substance use challenges across Northumberland County, Ontario, Canada.
- **Purpose**: Standalone client support portal where IHARC neighbours can manage appointments, access secure documents, review personalised updates, and stay connected with outreach teams. Supabase-backed admin tooling lives alongside the client experience to manage content that also powers the public marketing site.
- **Primary users**: IHARC clients, outreach staff, moderators, and partner agencies. Marketing-first visitors use the separate `I.H.A.R.C-Public-Website` app.
- **Success guardrails**: Maintain compassionate copy, WCAG-friendly patterns, and privacy/audit commitments captured in `I.H.A.R.C-Public-Website/docs/portal/architecture.md`. No regressions to Supabase RLS, audit logging, or rate limiting. Honour IHARC’s trauma-informed, harm-reduction-centred service model.

## Source System Snapshot
- Historic portal code lives inside the marketing repo (`I.H.A.R.C-Public-Website/src/app/portal/*`). That implementation focused on ideation and community moderation — we now treat it solely as a design reference.
- Admin workflows (resources, metrics, invitations, notifications, policies, etc.) currently exist inside the same marketing repo under `src/app/command-center/*`; STEVI is now the home for those mutations.
- Supabase functions (`portal-attachments`, `portal-moderate`, `portal-admin-invite`, etc.) and schemas (`portal`, `core`, `inventory`, `justice`) are shared across marketing, STEVI OPS, and this client portal.

## Target Architecture
- Split responsibilities:
  - `I.H.A.R.C-Public-Website`: pure marketing experience. It becomes a read-only consumer of shared Supabase content (resources, stats, navigation copy, etc.) surfaced through RLS-safe views/functions maintained by STEVI.
  - `STEVI`: Next.js 15 App Router application for clients + IHARC staff tools. Handles authentication, caching, admin mutations, and all Supabase write operations (appointments, documents, notifications, resources, marketing copy).
- Supabase acts as the single source of truth that bridges STEVI and the marketing site. Admin flows in STEVI write to Supabase tables/RPCs across schemas like `portal`, `core`, `inventory`, and `justice`, and the marketing app consumes the same data via read-only channels.
- Shared design tokens (Tailwind + CSS custom properties) remain aligned across repos. Consider formalising a shared package once both apps stabilise.
- Azure Static Web Apps handles deployments for each repo; both point at the same Supabase project/environment variables.

## Delivery Plan & Status

### Phase 0 — Alignment & Inventory ✅
- Mission, success criteria, and data guardrails captured.
- Legacy portal and admin surface audited. Supabase usage documented in `docs/migration-roadmap.md`.

### Phase 1 — Foundation & Scaffolding ✅
- Next.js 15 scaffold with shared providers, theming, and build tooling in place.
- Supabase SSR/browser clients and middleware migrated.
- Core navigation, layout shell, and home/appointments/documents/profile/support routes stubbed with STEVI-focused copy.
- Follow-ups completed: `.env.example` now includes admin tooling secrets and shared Supabase notes, and runtime expectations live in `docs/backend.md`.

### Phase 2 — Client Experience (🚧 in progress)
- Replace collaboration-era modules with STEVI-specific flows:
  - ✅ Landing, home dashboard, appointments request/history shell, document locker preview, support directory, profile management.
  - ☐ Wire appointments, documents, and support actions to Supabase tables/RPCs (confirm schemas via MCP before touching).
  - ☐ Implement notifications/alerts UI once schema confirmed.
  - ☐ Add Vitest/Playwright coverage for critical journeys.

### Phase 3 — Admin Workspace Migration (🚧 starting now)
- Extract admin tools from marketing repo, re-scope to STEVI (all backed by Supabase mutations and audit logs):
  - ✅ Profile verification & invitations (Supabase `portal.profiles`, `portal.profile_invites`, RLS-protected RPCs).
  - ✅ Resource/report library management (`portal.resource_pages`, attachments, embed helpers) now managed in STEVI under `/admin/resources`. Marketing site continues to read published rows.
  - ✅ Policies module (`portal.policies`, new enums/status) managed at `/admin/policies`, using TipTap rich text, RLS respecting roles, audit logging, and marketing cache revalidation.
  - ✅ Notifications queue + templates (`portal.notifications`, existing edge functions) to broadcast outreach updates.
  - ☐ Metrics ingestion controls (if still required) and any governance settings surfaced to staff (`portal.metric_catalog`, `portal.metric_daily`, etc.).
- Lock down the marketing app to read-only access patterns by exposing pre-approved SQL views or RPCs. Ensure STEVI admin revalidation triggers cover both apps (`/admin`, marketing routes, sitemap, etc.) so Supabase updates propagate everywhere.

### Phase 4 — Integration & Hardening (⬜ pending)
- Confirm cache invalidation strategy (reuse `src/lib/cache/*` tagging helpers).
- Validate Supabase RLS/auth contexts across server actions and API routes.
- Fill `docs/backend.md` with table/policy references gathered via Supabase MCP, plus environment setup instructions.
- Add regression tests and lint/typecheck gates.

### Phase 5 — Marketing Separation & Launch (⬜ pending)
- Update marketing repo to consume shared content via read-only APIs (no portal code).
- Set up redirects and comms for launch.
- Run coordinated release checklist with outreach/marketing teams.

## Supabase & Backend Expectations
- Continue using existing schemas (`portal`, `core`, etc.) and edge functions.
- All new functionality must respect RLS policies — confirm via MCP tools rather than migrations alone.
- Document environment variables, storage buckets, and function dependencies in STEVI docs.

## Current Deliverables & Milestones
- ✅ Repo scaffolding + base layout.
- 🚧 Client dashboard, appointments, documents, support, profile.
- 🚧 Admin workspace migration (resources, invites, notifications, policies, metrics).
- ⬜ Integration testing + Supabase documentation.
- ⬜ Marketing hand-off & dual-launch comms.

The STEVI team should treat this briefing as a living document. Update it as features ship, especially when admin tooling or Supabase dependencies change.

## Supabase & Backend Preservation
- Keep the Supabase schema untouched; only augment via migrations coordinated with data team. Use Supabase MCP tool to verify existing policies before shipping.
- Ensure Edge Functions remain in `I.H.A.R.C-Public-Website/supabase/functions` but create a plan to mirror them into STEVI repo or manage via external deploy pipeline.
- Update environment documentation to clarify which repo holds `.env` values and how to share secrets between deployments.
- Monitor audit logs and rate limits after launch to confirm service continuity.

### Access Control Implementation Notes
- `src/lib/portal-access.ts` is the single source of truth for role/feature gates. Any new privileged surface (profile verification, notifications, metrics, etc.) must register a boolean there (`canManageNotifications`, `canViewMetrics`, etc.) so UI and server actions stay aligned.
- `(portal)/layout.tsx` now wraps every route with `PortalAccessProvider`. Client components should call `usePortalAccess()` instead of re-fetching Supabase to check roles or feature access. Server components should accept `portalAccess` props from parents or reuse the shared helper sparingly.
- Navigation (PortalNav, TopNav, user menus) only renders links from the centralized blueprint so community members never see admin or staff-only destinations. Maintain that pattern whenever you introduce new menu links.
- When scoping future admin features, hide the corresponding cards/sections unless the current profile passes the relevant gate from `portal-access.ts`. This mirrors the RLS-enforced server checks and prevents accidental privilege escalation.

## Marketing Site Follow-Up
- After extraction, re-centre marketing copy on awareness, petitions, and contact info while pointing action CTAs to STEVI.
- Maintain snapshot stats (read-only) on marketing pages using small fetchers or static content so the marketing app no longer needs heavy portal dependencies.
- Document marketing/portal integration points in `I.H.A.R.C-Public-Website/docs/hand-off.md`.

## Deliverables & Milestones
- ✅ Inventory & architecture briefing (this document).
- 🟡 STEVI repo scaffolding & shared resource migration.
- 🟡 Portal route parity with legacy experience.
- 🟡 Client-centric upgrades and QA sign-off with outreach team.
- 🟡 Marketing site cleanup, redirects, and dual-launch comms.

The STEVI team should treat this briefing as the living source of truth—update it as plans solidify, especially when Supabase schema or shared infrastructure changes.


NOTES: 
Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

Always use the supabase mcp tool to view existing implementation. Follow existing patterns already implemented, i.e use of schemas outside of "public" such as "core", "inventory", "justice", etc. Always check first and do not rely on migration files as a reference. 
