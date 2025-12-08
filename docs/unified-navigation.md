# Navigation Ownership (Updated)

The unified shell has been retired. The source of truth for the dual-shell architecture, navigation, and guards now lives in `docs/architecture/shells.md`.

Key references:
- `docs/architecture/shells.md` – route groups, guard rules, preview behaviour, and testing expectations.
- `src/lib/portal-navigation.ts` – workspace navigation sections (staff/admin/org).
- `src/lib/client-navigation.ts` – client navigation.
- `src/components/shared/layout/app-navigation.tsx` – shared navigation surfaces with preview handling.

There are no legacy fallbacks or compatibility routes; new surfaces must align with the dual-shell patterns documented above.
