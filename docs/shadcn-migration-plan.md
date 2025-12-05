# shadcn/ui Cutover Plan (Single Pass, No Fallbacks)

Purpose: enable a fresh Codex instance to migrate this codebase to shadcn/ui in one execution, removing all legacy UI and tokens. No dual systems, no back-compat.

## Repo context
- Current global CSS: `src/styles/main.css` (Material 3 tokens + utilities).
- Global layout: `src/app/layout.tsx` imports `@/styles/main.css` and uses `ThemeProvider` + `Toaster`.
- Key shells: `src/components/layout/top-nav.tsx`, `src/components/shells/app-shell.tsx`, `src/components/layout/page-header.tsx`, sidebar in `src/components/layout/app-navigation.tsx`.
- Legacy UI primitives live in `src/components/ui/*.tsx` (Button, Card, Badge, StatTile, etc.).
- Tokens file: `tokens/material3.json`.

## 0) Preconditions
- `npm install` succeeds.
- You can run `npm run lint` and tests locally.

## 1) Initialize shadcn/ui
```bash
npx shadcn@latest init
# Choices: TypeScript, Tailwind, RSC support = yes, alias = @/
```
- Update `tailwind.config.ts` content globs to include: `./src/app/**/*.{ts,tsx}`, `./src/components/**/*.{ts,tsx}`, `./src/lib/**/*.{ts,tsx}`, and any `./src/content/**/*.{md,mdx}`.
- Add/keep `@/lib/utils` `cn` from shadcn template; remove other `cn` helpers.

## 2) Generate primitives (one command)
```bash
npx shadcn@latest add \
  button input label textarea select checkbox radio-group switch badge avatar skeleton tooltip popover dialog drawer \
  tabs card separator scroll-area sheet dropdown-menu menubar accordion breadcrumb alert toast sonner table \
  navigation-menu command form
```
- Output: `src/components/ui/*`. Create `src/components/ui/index.ts` that re-exports all generated components.

## 3) Theme setup
- Add `src/styles/theme.css` from shadcn template.
- In `src/app/layout.tsx`, replace `import '@/styles/main.css'` with `import '@/styles/theme.css'` (and any minimal global resets you keep).
- In `tailwind.config.ts`, switch to shadcn token usage (`--background`, `--primary`, radius, shadow defaults). Delete custom color/shadow maps copied from Material 3.
- Set fonts via `next/font` and map to CSS vars in `theme.css`.
- Keep existing `ThemeProvider` if desired; otherwise swap to the shadcn `ThemeProvider` pattern (next-themes) for dark/light based on tokens.

## 4) Remove legacy tokens/CSS
- Delete `tokens/material3.json`.
- Strip Material token blocks and unused utilities from `src/styles/main.css`. If no resets are needed, delete the file entirely; otherwise keep only the resets and ensure it is **not** imported.

## 5) Primitive swap (mechanical)
- Replace all imports of legacy primitives (`Button`, `Card`, `Badge`, `Skeleton`, inputs, switches, etc.) with shadcn equivalents across `src`.
- Delete old primitive files after replacement: `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `stat-tile.tsx`, etc.

## 6) Shell rebuild (specific files)
- `src/components/layout/top-nav.tsx`: refactor using shadcn `navigation-menu`, `dropdown-menu`, `sheet`, `button`, `avatar`, `command`.
- `src/components/layout/app-navigation.tsx`: rebuild sidebar with shadcn `navigation-menu` + `scroll-area`; remove custom scrollbar CSS.
- `src/components/shells/app-shell.tsx`: ensure containers use shadcn cards/buttons where applicable.
- `src/components/layout/page-header.tsx`: rebuild with shadcn `breadcrumb`, `button`, `badge`.

## 7) Overlays & feedback
- Replace all modals/drawers with shadcn `Dialog`/`Drawer`.
- Replace toast usage with shadcn `toast` and `Sonner` provider from `ui/sonner` mounted in `src/app/layout.tsx` (remove old `Toaster` import/usage).
- Use shadcn `Alert` for inline status/empty states.

## 8) Data display & navigation widgets
- Replace simple tables with shadcn `Table`; wrap complex grids with shadcn tokens for row/header styling.
- Swap Tabs/Accordion to shadcn versions.
- Add shadcn `Breadcrumb` in page headers; remove custom breadcrumb logic.
- Use shadcn `Form` (react-hook-form adapter) for all forms.

## 9) Purge legacy assets and lock imports
- Remove leftover CSS utilities in `src/styles/main.css`; ensure file is unused or deleted.
- Add ESLint rule to forbid imports from removed legacy UI paths (e.g., specific deleted files).

## 10) Quality gates
```bash
npm run lint
npm run test   # or vitest
```
- Add Playwright visual snapshots for `/`, `/admin/operations`, `/login` to detect layout regressions.
- Verify dark/light themes via shadcn tokens.

## Acceptance Criteria
- All UI imports come from `@/components/ui` or compositions built on them.
- Only `theme.css` supplies design tokens; no Material token files remain.
- All shells, forms, overlays, tables, nav, and headers use shadcn primitives; no legacy components or CSS are imported.
- Lint/tests and visual checks pass; focus states and spacing are consistent.
