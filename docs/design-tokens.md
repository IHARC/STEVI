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
