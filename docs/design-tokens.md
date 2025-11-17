# Material 3 design tokens

The STEVI surface inherits its entire color, typography, shape, spacing, and elevation system from the Material 3
specification. The canonical token definitions live in `src/styles/main.css` where we map the exported Figma tokens to
CSS custom properties (for both light and dark palettes). Tailwind consumes those variables in `tailwind.config.ts`, so
utility classes (`text-headline-md`, `rounded-xl`, `gap-space-md`, etc.) already emit the correct Material 3 values.

Key implementation notes:

- **No manual letter-spacing overrides** – the `fontSize` scale in `tailwind.config.ts` embeds each Material 3 type token
  (size, line-height, letter-spacing, and weight). Use the semantic text utilities instead of ad-hoc `tracking-*` rules.
- **Use Tailwind radii helpers** – `rounded-xl`, `rounded-2xl`, and `rounded-3xl` are wired to the Material 3 shape tokens.
  Avoid `rounded-[var(--md-sys-shape-…)]` in components so we can evolve radius tokens centrally.
- **Elevation + state layers** – `shadow-level-1` and `shadow-level-2` reference the Material 3 elevation presets defined
  in `main.css`. Prefer them over `shadow-sm|md|lg|xl` and always pair interactive elements with the standard hover/focus
  opacity helpers in `main.css`.
- **Color utilities** – semantic colors such as `text-on-surface`, `bg-surface-container-low`, and
  `border-outline-variant` all read from `--md-sys-color-*`. Keep bespoke rgb/hex usage restricted to vendor icons (e.g.
  the Google button) so palette updates propagate automatically.
- **Regenerate tokens from source** – update `tokens/material3.json` with the latest export and run
  `npm run sync:tokens` to rewrite the `:root`/`.dark` blocks in `src/styles/main.css`. Treat that section as generated
  content rather than editing it by hand.

Refer to the Material 3 token guidance captured in the MDUI design-token docs for the latest naming and value
expectations. That reference informed how we map CSS custom properties inside STEVI.

## Admin surface color roles

The admin dashboards lean on a fixed set of semantic surfaces so cards, nav rails, and callouts stay consistent. Use the
matrix below as the single source of truth when composing new layouts.

| Token / utility class            | Typical usage                                                                 | Notes                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `bg-surface`                     | Page canvas and long-form reading areas                                       | Always pair with `text-on-surface` and default body typography.                                     |
| `bg-surface-container-low`       | Module backgrounds, mobile nav panels, command palettes                       | Gives subtle elevation without needing a shadow.                                                    |
| `bg-surface-container`           | Card shells, forms, drawers                                                   | Use when the card also has a `border-outline/15` divider or shadow.                                 |
| `bg-surface-container-high`      | Menus, popovers, and inspector trays                                          | Reserve for floating UI so it contrasts against `bg-surface`.                                      |
| `bg-brand-soft` / `text-brand`   | Top-nav highlight pills, marketing shortcuts, any CTA that should feel “brand”| Works best with `NavPill` tone `"brand"` which adds the correct state-layer overlays automatically. |
| `bg-primary` / `text-on-primary` | Primary actions (buttons, hero metrics)                                       | Use `Button` `variant="default"` to inherit matching state layers and focus treatment.              |
| `bg-secondary-container`         | Low-emphasis banners, neutral tags, mobile accordions                         | Pair with `text-on-secondary-container`; avoid stacking more than two consecutive surfaces.         |
| `border-outline` / `/15`         | Card seams, section dividers, and accordion outlines                          | Never lower the opacity further; instead, switch to `surface-container-low` for additional contrast.|
| `text-on-surface/80`             | Supporting copy, metadata, helper text                                        | Apply via typography utilities; don’t hard-code rgba tweaks.                                        |
| `text-inverse-on-surface`        | Labels inside inverse surfaces (e.g., night banner, alert overlays)           | Combine with `bg-inverse-surface` or `NavPill` tone `"inverse"`.                                    |
