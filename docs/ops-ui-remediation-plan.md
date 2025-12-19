# Ops UI Remediation Plan (Pre‑Production)

> **No back‑compat / no fallbacks.** This is a pre‑production app, so all changes assume the new IA and token system. We will **not** keep legacy classes, dual paths, or fallback logic in UI components.

## Goals
- Modern SaaS UX using brand colors **red / black / white** with neutral grays for surfaces.
- Navigation parity across **desktop, tablet, and mobile**.
- Consistent, predictable local navigation patterns across hubs.
- Improved accessibility (contrast, focus, and keyboard flow).

## Phase 1 — Navigation parity & discoverability ✅
- **Ops hub rail (desktop/tablet):**
  - Keep hub list.
  - Add contextual sub‑nav for the active hub (accordion or stacked list).
- **Ops mobile navigation:**
  - Replace hubs‑only sheet with a 2‑level list: hubs + hub subpages in the same sheet.
- **Settings navigation:**
  - Always show nested items (no hidden children).
  - Add clear active‑branch styling; avoid collapse that hides options.
- **Local navigation standardization:**
  - Prefer `PageTabNav` for hub‑level view switches.
  - Replace ad‑hoc Tabs used for routed views (e.g., Inventory hub) with `PageTabNav`.

## Phase 2 — Token and surface refresh (ops shell) ✅
- Align ops tokens with **red/black/white**:
  - Primary = red for key CTAs.
  - Accent/hover surfaces = neutral gray (avoid purple).
  - Improve `--muted-foreground` contrast for small labels.
- Update nav and tab active states to avoid “error‑red” blocks:
  - Use neutral backgrounds for selection.
  - Use red sparingly as an indicator (outline/border/underline).

## Phase 3 — Responsive UX pass ✅
- Ensure nav, sub‑nav, and settings panels behave consistently at **tablet breakpoints**.
- Cap form widths on large screens while keeping tables full‑width.
- Validate Inbox panel behavior across breakpoints.

## Phase 4 — Accessibility ✅
- Contrast check on nav labels, small text, and muted surfaces.
- Focus rings visible on all interactive elements.
- Keyboard navigation in sheets/menus verified.

## Acceptance Criteria
- Ops users can access the same navigation targets on desktop/tablet/mobile.
- Hubs and subpages are visible without hidden or legacy fallback UI.
- Ops palette reads as modern SaaS with brand‑aligned red/black/white.
- WCAG AA contrast for nav, labels, and body text.

## Progress Notes
- Implemented query‑aware active nav and hub sub‑nav parity across desktop/tablet/mobile.
- Standardized hub‑level navigation (Inventory now uses `PageTabNav`).
- Updated ops theme tokens and active/hover styles to neutral surfaces with red accents.
- Updated relevant links to explicit `view`/`tab` params for consistent active states.
- Removed legacy/extra plan docs to avoid confusion for new Codex instances.

## Out of Scope
- Client shell visual refresh (unless necessary for shared component updates).
- Legacy theme/token support.
