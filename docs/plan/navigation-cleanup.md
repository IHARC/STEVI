# Workspace Navigation & Header Cleanup Plan (2025-12-01)

Guidance for Codex agents to implement the requested UI/UX consolidation. The goal is a single, modern SaaS shell that uses one workspace switcher (top bar), one navigation column (workspace-aware), and cleaner page headers/cards — all with Material 3 tokens and no inline CSS or legacy fallbacks.

## Objectives
- Remove duplicated workspace switching and nav stacks so the shell feels like one app.
- Align the shell with Material 3 patterns: top app bar for context switching, one navigation drawer/rail for workspace routes, standard page headers, compact stat cards, and button-first actions (chips reserved for filters/states).
- Keep code modular and dead-code free; no backward-compatibility shims.
- Maintain existing auth/RLS/audit flows; UI-only refactor.

## Current State (audit)
- **Global + workspace nav duplication**: `buildPrimaryNavItems` in `src/lib/primary-nav.ts` injects workspace items into the left rail (`PrimaryNavRail`), while `WorkspaceSectionLayout` + `WorkspaceSectionNav` (see `src/components/layout/workspace-section-layout.tsx` and `src/components/layout/workspace-section-nav.tsx`) render a second nav inside the content area for admin/staff/org.
- **Top bar switcher already exists**: `WorkspaceSwitcher` used via `WorkspaceSwitcherSlot` inside `src/components/layout/top-nav.tsx`, but left nav still lists workspaces.
- **Page headers are noisy**: e.g., `src/app/(portal)/admin/page.tsx` shows multiple “Admin workspace” labels and action chips in a dedicated band. Similar patterns in `src/app/(portal)/staff/page.tsx` and `src/app/(portal)/org/page.tsx`.
- **Metric tiles are oversized**: admin/org landing pages use large rounded cards with generous padding instead of compact stat tiles.
- **Action chips used as CTAs**: shortcut chips in `AdminPage` and other pages use `Button variant="outline"` + `Badge` instead of clear primary/secondary buttons.

## Implementation Plan (sequenced)
1) **Refactor navigation data model**
   - Remove workspace entries from `buildPrimaryNavItems`; keep only global items (`reports`, `settings`, and any future account/global links). Ensure the remaining items still drive command palette context.
   - Introduce a single workspace-aware nav config derived from existing blueprints (`ADMIN_NAV_BLUEPRINT`, `STAFF_NAV_BLUEPRINT`, `ORG_NAV_BLUEPRINT` in `src/lib/portal-access.ts`). Expose a helper (e.g., `resolveWorkspaceNavForShell(access, activeWorkspace)`) that returns grouped links for the active workspace only.
   - Update tests/typing so there are no dual nav concepts left. Delete unused PrimaryNav item IDs for workspaces.

2) **Replace left rail with one workspace drawer**
   - Build a new `WorkspaceDrawer` component (Material 3 Navigation drawer) that:
     - Renders the active workspace label as the section header.
     - Displays grouped links (from the resolved workspace nav) with nested items; supports hover/focus states via existing M3 tokens.
     - Anchors global items (`Reports`, `Settings`) at the bottom separated by a divider.
   - Swap `PrimaryNavRail` usage in `src/components/shells/app-shell.tsx` with the new drawer. Remove the secondary in-content nav (`WorkspaceSectionNav`) completely.
   - Ensure responsive behavior: drawer collapses to sheet/rail on mobile using existing sheet primitives (no inline styles).
   - Delete or deprecate `PrimaryNavRail`, `PrimaryNavBar`, and `PrimaryNavMobile` if they are no longer referenced. Remove `WorkspaceSectionNav` and `WorkspaceSectionLayout` once all layouts migrate.

3) **Simplify app layout wrappers**
   - Replace `WorkspaceSectionLayout` usage in `src/app/(portal)/admin/layout.tsx`, `src/app/(portal)/staff/layout.tsx`, and `src/app/(portal)/org/layout.tsx` with a lightweight wrapper that assumes nav is already provided by the shell (only handles breadcrumbs/quick actions if still needed).
   - Keep `WorkspaceContextProvider` and `WorkspaceProvider` intact for routing logic, but ensure they no longer expect dual nav stacks.
   - Re-evaluate `WorkspaceClientNav` and the client preview banner to ensure they still slot correctly under the top app bar without introducing a second nav column.

4) **Top app bar adjustments**
   - Keep workspace switching **only** in the top bar using Material 3 segmented buttons or an exposed dropdown (`WorkspaceSwitcher`). Remove any workspace affordances from the new drawer.
   - If segmented buttons are chosen, implement them as a token-driven component (no inline CSS) and retire the current dropdown variant; otherwise restyle the dropdown to M3 exposed menu spec.
   - Remove horizontal nav pills (`PrimaryNavBar`) from the top bar once the drawer owns navigation.

5) **Redesign page headers**
   - Standardize page headers (title + subtitle + right-aligned primary/secondary buttons) using M3 typography (`titleLarge`/`headlineSmall`, `bodyLarge` for subtitle) and button variants (`filled` primary, `tonal` secondary).
   - Update headers in `src/app/(portal)/admin/page.tsx`, `src/app/(portal)/staff/page.tsx`, `src/app/(portal)/org/page.tsx`, and any other landing/overview pages that currently show duplicated workspace labels or chip bands.
   - Remove redundant pills/chips (e.g., gray “Admin workspace” bar) and relocate actions into the header’s trailing actions slot.

6) **Standardize actions vs chips**
   - Convert CTA-like chips in admin/staff/org pages to buttons (`Button variant="default"/"secondary"/"tonal"`). Reserve chips for filters/status only.
   - Audit shared components (e.g., quick action lists, shortcut stacks) to ensure they emit buttons or list items, not ad-hoc pill combos.

7) **Compact metric/stat tiles**
   - Replace large rounded metric cards with compact stat tiles:
     - Use 16px padding, `labelLarge` for labels, `headlineMedium` for values, subtle elevation (`shadow-level-1`) and `rounded-xl`.
     - Keep tone handling (warning/neutral) via tokenized surfaces (`bg-primary-container`, etc.).
   - Apply in `AdminPage` summary cards and `OrgHomePage` summary cards; check staff summaries for consistency.

8) **Content surface cleanup**
   - Remove nested “card-in-card” patterns: main content surface should be one `surface` container; cards only for logical groupings (tables, stats, panels). Adjust `AppShell` container if needed to avoid double borders.
   - Align spacing to the existing scale (`space-*` tokens): section gaps 24px (`space-xl`), intra-section 8–16px (`space-sm`/`space-md`).

9) **Global placement for Reports/Settings**
   - Ensure the new drawer pins `Reports` and `Settings` at the bottom with divider + compact icon treatment. Update routing to match existing paths; remove their presence from top-level primary nav.

10) **Cleanup & dead-code removal**
   - Delete obsolete components, styles, and utility code after migration (primary nav variants, section layout wrappers, unused nav item IDs).
   - Remove any now-unused localStorage hooks from `WorkspaceSectionNav` if the component is retired.

11) **Regression checks**
   - Visual pass (desktop/tablet/mobile) for all workspaces: confirm single top bar, single nav column, no duplicate workspace labels, and header actions aligned right.
   - Accessibility: verify ARIA labels on the new drawer, focus ring tokens, and keyboard navigation for workspace switcher and nav items.
   - Run `npm run lint` and `npm run typecheck`. If snapshots exist for nav components, update them.

## Guardrails & standards
- **Tokens only**: use Tailwind utilities backed by M3 tokens (`text-*`, `bg-surface*`, `shadow-level-*`, `space-*`, `rounded-*`). No inline styles, no bespoke rgb/hex values.
- **No fallbacks/legacy**: remove deprecated components instead of hiding them. Do not keep duplicated navs or workspace links for “compatibility.”
- **Security/logging**: UI-only changes must not bypass audit/RLS flows; keep existing action wiring intact.
- **Documentation**: update or add short README snippets near new components if usage isn’t self-evident; prefer self-describing props.

## Deliverables
- Refactored nav shell with single workspace drawer and top-bar workspace switcher.
- Updated page headers and stat tiles for admin/staff/org landing pages.
- Deleted legacy nav components/layouts no longer in use.
- Passing lint/typecheck.
