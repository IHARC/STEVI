# STEVI Workspace UX Delivery Plan (updated 2025-11-27)

Purpose: track implementation of workspace UX upgrades while honoring STEVI ground rules (trauma-informed, WCAG, RLS/consent/audit, Material 3 tokens, no legacy/compat shims, shared Supabase schema intact). Network is restricted; prefer MCP; remove placeholders/legacy code as we go.

## Guardrails (apply to every task)
- RLS + consent + audit: every mutation uses existing server actions/RPCs and logs via `logAuditEvent`; respect preview mode (`ClientPreviewGuard`) and rate limits (`portal_check_rate_limit`).
- Authorization: derive capabilities from `PortalAccess` only; no JWT/app_metadata fallbacks; keep UI guards aligned with RLS.
- Design system: use Material 3 tokens (`tokens/material3.json` -> `docs/design-tokens.md`), Radix/shadcn wrappers; avoid ad-hoc colors/spacing; remove deprecated components instead of keeping shims.
- Accessibility/trauma-informed: WCAG focus/contrast, keyboard paths, calm language, avoid stigmatizing terms; sticky/peek/shortcuts must keep focus states intact.
- Data/storage: reuse existing Supabase schemas and RPCs; do not change schema; storage via `portal-attachments` with signed URLs; no new endpoints without RLS/audit.
- Caching/routing: keep authed routes dynamic; use `revalidatePath`/`revalidateTag` as needed; no static rendering of authed content.

## Phase Checklist (status: TODO unless marked)

### Phase 1 — Navigation & Wayfinding
1. Command palette enrichment in `src/components/layout/command-palette.tsx` with entity/action providers; builders in `src/lib/portal-access.ts`; RLS-safe prefetch (limit 20), grouped by type, read-only previews. **Status:** Done
2. Context-aware "New" button beside search in `src/components/layout/top-nav.tsx`, keyed to `activeWorkspace` from `src/lib/workspaces.ts`; actions per workspace using existing server actions; remove placeholder CTAs. **Status:** Done
3. Workspace switcher badges in `src/components/layout/workspace-switcher.tsx`: show role + approval status, amber Preview pill with "Exit preview" shortcut; maintain keyboard shortcut (Shift+Cmd/Ctrl+W). **Status:** Done
4. Sticky action bar option in `src/components/shells/workspace-shell.tsx` (and portal shell if shared): pins title/filters/primary CTA; keeps focus outlines visible; uses Material 3 spacing. **Status:** Done
5. Inbox right-rail/slide-over component shared by PortalShell/WorkspaceShell showing pending approvals/notifications/expiring docs/tasks; server-side summaries, dismissible links, RLS-respecting. **Status:** Done (portal inbox wired to appointments/docs/notifications)

### Phase 2 — Client Portal
1. Appointments timeline: merge upcoming/history in `src/app/(portal)/home/page.tsx` and `/appointments/page.tsx`; chronological order with status chips (Scheduled/Needs confirmation/Completed); inline reschedule/cancel actions behind `ClientPreviewGuard`; add skeleton + "what happens next" copy. **Status:** Done
2. Support composer: bottom-docked tray on `src/app/(portal)/support/page.tsx` (textarea + preferred contact select + SLA text); disabled in preview; reuse existing support submit action. **Status:** Done
3. Document locker: replace placeholder in `src/app/(portal)/documents/page.tsx` with search/filter, expiry badges, request new link/extend access buttons, audit snippet (shared by, last viewed, expires); use signed URL action; read-only audit display. **Status:** Done
4. Personal context header on `home/page.tsx`: preferred name, pronouns, preferred contact with link to profile edit; supportive, non-stigmatizing copy. **Status:** Done
5. Empty/loading states for appointments/documents: skeletons + expectation text for slow connections. **Status:** Done

### Phase 3 — Staff Workspace (later)
- Cases table with saved views; peek panel; "Today" strip; fast outreach entry; keyboard shortcuts (N, /, Shift+Cmd/Ctrl+W). **Status:** Pending (not started)

### Phase 4 — Organization Workspace (later)
- Org dashboard metrics; invite side-sheet with rate-limit preview; role clarity toggles; settings cards with toasts. **Status:** Pending

### Phase 5 — Admin Workspace (later)
- Operations dashboard; nav favorites/recents; user mgmt saved searches + side-sheet actions; resources/policies autosave + preview; notification templates with test send + consent/secret gating. **Status:** Pending

## Execution Notes
- Remove legacy/placeholder components when replaced; no backward compatibility layers.
- Prefer shared patterns (table+peek, side-sheet, sticky bar, right rail) to minimize bespoke UI.
- Testing: add/update Vitest + Playwright coverage for new navigation and client portal flows; run `npm run lint`/`typecheck` when feasible.
- Marketing cache: when admin surfaces touch marketing content, ensure revalidation/tag hooks are wired; avoid static caches for authed data.

## Current Work Focus
- Phase 3 next (Staff workspace tables/peek/today/shortcuts) while maintaining audit/RLS/preview and Material 3 adherence. Phases 1–2 completed.
