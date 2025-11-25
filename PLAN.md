# Roles & People Foundation — Execution Plan

## Why these changes are needed
- Inventory and donations actions were authorizing with JWT/app_metadata roles; we traced this to `getIharcRoles` and fixed it to use the canonical `get_user_roles` RPC via `loadPortalAccess`. We need the same rigor across schema and code to avoid privilege drift.
- Client/person linkage currently relies on `created_by` fallbacks; staff- or partner-created records leave clients orphaned. A first-pass code fix now prefers grants, but the schema needs explicit foreign keys to be reliable and scalable.
- Service and activity records don’t attribute the providing org/user, limiting RLS and auditing for partner workflows (food bank, warming room, outreach).
- Supabase types are out of sync (mixed RPC return shapes, missing `person_access_grants`), forcing manual types and risking runtime errors.
- You asked for clean, modular code with foreign keys, no fallbacks/legacy shims, and consistent Material 3 usage.

## Requirements to honor
- Use foreign keys instead of string linkage; no hidden fallbacks or backward-compatibility shims.
- Keep code and Supabase in lockstep; regenerate types after schema updates.
- Maintain audit + RLS integrity; no dead/legacy code left behind.
- Follow Material 3 tokens for UI changes (not in scope yet, but keep in mind).

## Tasks (to execute next)
- [ ] Supabase schema: add explicit person-user/profile links (e.g., `core.people.profile_id` FK to `portal.profiles` or junction table `core.user_people` with FKs to `auth.users` and `core.people`, unique per user). Add provider attribution FKs to `core.people_activities` (org/profile).
- [ ] Supabase schema: ensure `core.person_access_grants` exists with FKs (`person_id`, `grantee_user_id`, `grantee_org_id`, `granted_by`) and consistent scopes; align `get_user_roles` RPC to a single return shape.
- [ ] Regenerate Supabase types; remove hand-typed grant shapes and stringly typed RPC handling in code.
- [ ] Update person resolution and fetchers to rely on the new FK/junction table first, grants second, no `created_by` fallback; update consent/case UI/actions accordingly.
- [ ] Attribute activities/notes/check-ins with new provider org/profile FKs; audit logs remain intact.
- [ ] Add tests: role resolution, grant-based person lookup, and guarded inventory/donations paths.
- [ ] Run `npm run lint` and `npm run typecheck`; address any regressions.

## Working notes
- Supabase changes must be coordinated (shared project with marketing/OPS). No migrations were run yet.
- Current code fixes already in repo: RPC role parsing hardened; inventory/donations now use `loadPortalAccess`; person lookup now checks grants before `created_by`.
