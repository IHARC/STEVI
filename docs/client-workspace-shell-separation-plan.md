# Client / Workspace Shell Separation Plan

**Goal:** Cleanly separate the client portal from staff/admin/org tools so each runs in its own shell, navigation, providers, and theme. Remove ambiguity, drop cross-shell fallbacks, and keep preview as an explicit, intentional entry point only from the workspace side.

## Principles
- Two distinct route groups and layouts: `(client)` and `(workspace)`; no shared shells or menus.
- No backwards-compat shims or fallbacks. Old routes must be migrated or removed.
- Client shell optimized for low digital literacy: minimal nav, large targets, plain language.
- Workspace shell keeps power-user tools (command palette, quick actions, inbox, complex nav).
- Shared code only at the primitive layer (`src/ui`, `src/lib/shared`).

## Target Structure
```
src/
  app/
    (client)/
      layout.tsx           // client-only providers, header, footer
      page.tsx             // /home
      messages/page.tsx
      appointments/page.tsx
      documents/page.tsx
      support/page.tsx
    (workspace)/
      layout.tsx           // existing portal layout (TopNav, AppNavigation, CommandPalette, etc.) renamed/moved here
      admin/...            // unchanged paths
      staff/...            // unchanged paths
      org/...              // unchanged paths
  shells/
    client/
      client-header.tsx
      client-footer.tsx
      client-help-strip.tsx
      client-welcome-cards.tsx
    workspace/
      (keep existing TopNav/AppNavigation/etc.)
  lib/
    client-nav.ts          // flat list of client links (5–7 items)
    workspace-nav/         // existing portal-navigation.ts stays; remove client section
  theme/
    client-tokens.ts
    workspace-tokens.ts
```

## Work Items
1) **Create client layout** `(client)/layout.tsx`
   - Providers: theme, auth session, minimal context (no portal access/inbox).
   - Header: logo, links to Home/Messages/Appointments/Documents/Support, prominent "Need help now" button.
   - Footer: contact info, hours, simple links.
   - Add first-load helper bar and offline banner (respect `navigator.onLine`).

2) **Move client routes under `(client)`**
   - `/home`, `/messages`, `/appointments`, `/documents`, `/support` pages move into `(client)` group.
   - Update imports to use client header/footer and client-specific components.
   - Remove dependency on workspace-only providers/components.

3) **Strip client nav from workspace shell**
   - In `portal-navigation.ts`, remove `client-portal` section entirely.
   - Adjust tests accordingly (`portal-navigation.test.ts`).
   - Workspace TopNav/AppNavigation remain, but never show client items.

4) **Preview entry/exit flow (workspace side only)**
   - Keep a single CTA in workspace top nav/user menu: "Preview client portal" linking to `/home?preview=1` (renders `(client)` layout with preview flag).
   - In client layout, show an exit banner when `preview=1` (“You’re viewing the client experience. Exit preview”). Exit link returns to workspace landing (`/admin/operations` or resolved landing path).

5) **Client navigation & UX hardening**
   - Replace dropdowns with large home cards (Today, Messages, Appointments, Documents, Ask for help).
   - Enforce tap targets: min-height 48px, padding 14–16px, gap 12px; body text 16–18px, line height 1.5.
   - Plain-language labels (e.g., "Ask for help", "My visits", "My files").
   - Persistent "Need help now" button in header/footer and a support strip on `/home` and `/support` (phone/SMS/hours).

6) **Theme tokens split**
   - Introduce `client-tokens.ts` (higher contrast, larger base font, simplified palette).
   - `workspace-tokens.ts` keeps current scales.
   - Scope tokens via CSS variables set in each layout root.

7) **Guards & middleware**
   - `(client)` layout guard: allow client users; allow preview when `preview=1` and user has staff/admin/org role; otherwise redirect to workspace landing.
   - `(workspace)` layout guard: require staff/admin/org access; otherwise redirect to `/home`.

8) **Testing**
   - Vitest: update navigation tests to assert client section is absent in workspace nav and client nav has exactly the defined links.
   - Playwright smoke:
     - Client: header shows 3–5 links, "Need help now" visible; offline banner appears when mocked offline.
     - Workspace: command palette exists; no client links in nav.
     - Preview: banner visible; exit returns to workspace landing.

9) **Cleanup & redirects**
   - Remove any code paths referencing client nav in workspace shell.
   - Add Next.js redirects for legacy client URLs if their paths change; otherwise ensure moved pages keep same paths to avoid breakage.

## Sequence (one shot)
1. Add new directories/files (`(client)` layout, shells/client components, client tokens, client nav list).
2. Move client pages under `(client)`; wire to client layout/header/footer.
3. Remove client section from `portal-navigation.ts`; update tests.
4. Implement preview flag handling in client layout + exit banner.
5. Update workspace top nav CTA text/target if needed (preview link only).
6. Apply theme token scoping for client/workspace roots.
7. Add guards in both layouts (or middleware) for role/preview enforcement.
8. Run unit + Playwright smoke; fix regressions.

## Notes & Decisions
- No fallbacks: if a page remains in the wrong shell, fail fast (redirect/guard) rather than silently rendering.
- Keep shared primitives in `src/ui` and `src/lib/shared`; avoid cross-importing shell components.
- Paths remain the same for client-facing URLs (`/home`, `/messages`, etc.) to avoid breaking bookmarks; only the layout group changes.
