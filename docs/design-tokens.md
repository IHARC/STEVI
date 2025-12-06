# Shadcn/ui design tokens

STEVI now standardizes on the shadcn/ui token model. All primitives read from a single source of truth: `src/styles/theme.css`. Tailwind is configured to expose these CSS variables through semantic utilities (e.g., `text-primary`, `bg-card`, `border-destructive`). No Material token files or `main.css` remain in the repo.

## Token sources

- **Colors**: Light/dark palettes for background, foreground, primary, secondary, accent, muted, destructive, border, input, ring, card, and popover are defined as HSL variables inside `:root`/`.dark`.
- **Radius**: `--radius` drives the `rounded-*` scale (lg/md/sm) set in `tailwind.config.ts`.
- **Typography**: `--font-sans`, `--font-heading`, and `--font-mono` are wired to `next/font` in `src/app/layout.tsx`. Use Tailwind `font-sans`/`font-mono` utilities rather than hard-coded stacks.

## Usage guidelines

- Prefer semantic utilities (`text-foreground`, `bg-card`, `text-destructive`, `border-muted`) over hex values. If you need emphasis, use opacity (`/80`) instead of bespoke colors.
- For destructive or warning states, use `text-destructive`, `border-destructive`, `bg-destructive/10`, or `text-amber-600` for warnings. Avoid legacy `text-error` or `text-warning-foreground` classes.
- Buttons, inputs, alerts, dialogs, sheets, tabs, tables, breadcrumbs, navigation, and forms must come from `@/components/ui` primitives. Do not reintroduce bespoke styling or third‑party UI kits.
- Keep spacing and layout with Tailwind primitives; do not reintroduce generated token utilities or Material letter-spacing helpers.

## When adding tokens

- Update `src/styles/theme.css` to add or adjust CSS variables, then rely on Tailwind utilities that map to those variables.
- Avoid expanding Tailwind’s `boxShadow` palette beyond the shadcn defaults; prefer subtle borders (`border-border/40`) for elevation.
- Run `npm run lint` and `npm run typecheck` after any token change to ensure the config stays aligned.

## Quick references

- Primary actions: `bg-primary text-primary-foreground hover:bg-primary/90`
- Secondary/neutral: `bg-secondary text-secondary-foreground`
- Accent/informational: `bg-accent text-accent-foreground`
- Alerts: use `<Alert variant="destructive">` or `<Alert>` with the default card colors.

With this setup, theme updates only require editing `theme.css`; the rest of the app should consume tokens via the shared shadcn components and Tailwind utilities.
