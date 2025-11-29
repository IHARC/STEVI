# Schemas
- **audit** – custom audit logging (activity_logs, admin_actions, recovery/found-bike reports).
- **case_mgmt** – incident + client intake workflow.
- **core** – primary domain for people, orgs, roles, permissions, activities.
- **donations** – donation/catalog/payment tracking.
- **hazmat** – hazardous materials custody/incidents.
- **inventory** – stock, locations, purchasing, distributions.
- **justice** – justice/custody episodes and related entities.
- **portal** – Supabase-backed portal (profiles, registration, notifications, volunteer program).
- **public** – public-facing content/feedback/vector store.
- (System/infra omitted: pg_*, information_schema, auth, storage, realtime, graphql_*, extensions, supabase_* , net, cron, vault, pgbouncer.)

# People / client representation
- **core.people** – person master record. Key cols: id (bigint PK), name/email/phone, dob, housing_status, income_source, risk_level, gender, person_type (default `client`), person_status (default `active`), data_sharing_consent (bool, default false), privacy_restrictions, related_person_id FK→core.people, created_by/updated_by FKs→auth.users. RLS: SELECT for IHARC users or creator or active grants; UPDATE limited to IHARC or grants with scopes `update_contact`/`manage_consents`; DELETE for admin perms.
- **core.people_activities** – timeline entries for a person. FK person_id→core.people, provider_org_id→core.organizations, provider_profile_id→portal.profiles. Metadata (jsonb) includes `client_visible` flag used by RLS. RLS: SELECT if IHARC or grant scope (`timeline_client` with client_visible true, `timeline_full`, `write_notes`); INSERT/UPDATE only IHARC; DELETE admin.
- **core.people_aliases** – alt names per person_id FK→core.people; RLS: IHARC-only.
- **core.people_relationships** – links person1/2 FKs→core.people with type/status; RLS IHARC-only.
- **core.person_access_grants** – share a person with grantee_user_id (FK→auth.users) or grantee_org_id (FK→core.organizations); scopes enum (`view`, `update_contact`, `timeline_client`, `timeline_full`, `write_notes`, `manage_consents`); RLS: SELECT IHARC or grantee_user; INSERT/UPDATE/DELETE IHARC.
- **core.person_conditions** – health/diagnosis per person_id FK→core.people; reference_condition_id→core.medical_conditions; status/verification enums; RLS via view of authorized emails (tight medical access).
- **core.person_death_details** – death record per person_id FK→core.people (unique), related_episode_id→core.medical_episodes; cause/confirmation enums; RLS: staff-only for read/write, admin for delete.
- **core.person_field_visibility** – field-level visibility/required flags per person_type; no direct FKs; defines privacy_level.
- **case_mgmt.client_intakes** – intake form per person_id FK→core.people (CASCADE). Fields: intake_worker (uuid, likely auth.users), consent_confirmed, privacy_acknowledged (bool, required), risk_factors[] core.risk_factor_enum, ethnicity[], health_concerns[], housing_status/risk_level enums, notes. RLS: SELECT/INSERT/UPDATE require `is_iharc_user()`.
- **case_mgmt.incident_people** – participants in incidents; incident_id FK→case_mgmt.incidents; person_id FK→core.people (SET NULL). Flags for unknown party, involvement_type (check list), party_role enum. RLS: policy ALL true (no restriction).
- **case_mgmt.incident_person_medical** – medical details per incident_person_id FK→case_mgmt.incident_people; booleans for first aid/transport/referral, issue/transport enums. RLS: policy ALL true.
- **portal.profiles** – portal profile mapped to auth.users (user_id UNIQUE FK), org link via organization_id FK→core.organizations, affiliation type/status enums, lived experience enums, petition flags. RLS: self/service_role; org-admin for same org; portal/iharc admin for all.
- **portal.profile_contacts** – contact methods per profile_id FK→portal.profiles; optional user_id FK→auth.users; enforced formatting checks. RLS: self/service_role only.
- **portal.profile_invites** – invitations; invited_by_profile FK→portal.profiles, invited_by_user/user_id FKs→auth.users, organization_id FK→core.organizations, profile_id FK→portal.profiles; status enum. RLS inherited? (No explicit select policy; likely default deny).
- **portal.registration_flows** – onboarding/public intakes; supabase_user_id FK→auth.users, profile_id FK→portal.profiles. Captures chosen/legal name, contact info with safe-call/text flags, DOB month/year, postal code, identity fields, booleans consent_data_sharing/consent_contact/consent_terms, metadata jsonb, timestamps. RLS: INSERT allowed for public with flow_type in allowed list and user linkage rules; no SELECT policy (non-staff cannot read).
- **portal.volunteer_profiles** – volunteer record linked to profile_id FK→portal.profiles, current_status_id FK→volunteer_statuses; contact/address, emergency contact, skills/interests, checks/training flags. RLS: iharc_admin only.
- **portal.volunteer_role_assignments** – volunteer_profile_id FK→volunteer_profiles, role_id FK→volunteer_roles, assigned_by FK→portal.profiles. RLS: iharc_admin only.
- **portal.volunteer_roles** – role catalog. RLS: iharc_admin only.
- **portal.volunteer_status_assignments** – volunteer_profile_id FK, status_id FK→volunteer_statuses, assigned_by FK→portal.profiles. RLS: iharc_admin only.
- **portal.volunteer_statuses** – status catalog. RLS: iharc_admin only.

# Auth user mapping
- auth.users is referenced by: core.people (created_by/updated_by), core.organizations (created_by/updated_by), core.organization_people (created_by/updated_by), core.user_people (user_id UNIQUE, ON DELETE CASCADE), core.user_roles (user_id, granted_by, ON DELETE CASCADE), portal.profiles (user_id UNIQUE, ON DELETE CASCADE), portal.profile_contacts (user_id), portal.profile_invites (invited_by_user_id, user_id), portal.registration_flows (supabase_user_id).
- Canonical person link: **core.user_people** enforces one-to-one between auth.users.id and core.people.id (unique on user_id and person_id) with optional link to portal.profiles.
- Portal-side identity: **portal.profiles.user_id** provides unique mapping of auth.users to portal profile; user_people bridges that profile to core.people for client/staff linkage.

# Organizations and memberships
- **core.organizations** – org master; created_by/updated_by FKs→auth.users; status enum defaults active.
- **core.organization_people** – membership/relationship between people and orgs with relationship_type enum, job_title, is_primary; FKs to core.organizations, core.people, created_by/updated_by→auth.users.
- **core.user_roles** – assigns roles (role_id FK→core.roles) to auth.users with granted_by→auth.users; UNIQUE (user_id, role_id).
- **portal.profiles.organization_id** – ties portal users to an org (FK→core.organizations); org admin policies depend on this.
- **portal.profile_invites.organization_id** – pending membership invites.
- Volunteer roles/statuses live in portal.* and are admin-controlled (no self-serve policies visible).

# Existing consent / agreement / sharing fields
- **core.people**: data_sharing_consent (bool, default false), privacy_restrictions (text), preferred_contact_method; consent-related access managed via person_access_grants (scope includes `manage_consents`).
- **core.person_field_visibility**: defines per person_type field visibility/required/privacy_level.
- **case_mgmt.client_intakes**: consent_confirmed (bool), privacy_acknowledged (bool), risk_factors[]/health_concerns[] enums.
- **portal.registration_flows**: consent_data_sharing, consent_contact, consent_terms (bools); contact safety flags (contact_phone_safe_call/text/voicemail); metadata jsonb for extra terms.
- **people_activities**: metadata jsonb; RLS checks `metadata->>'client_visible'` for grant scope `timeline_client`.
- **person_access_grants**: scopes enumerate view/update/consent-related permissions; grantee_user_id/grantee_org_id recipients; expiry support.

# RLS overview (people/consent related)
- **core.people**: SELECT/UPDATE gated by IHARC role or person_access_grants; creators can read/update; DELETE restricted to admin permission `people.delete`.
- **core.person_access_grants**: IHARC can CRUD; grantee_user can SELECT their grants.
- **core.people_activities**: SELECT requires IHARC or grant scope; metadata client_visible needed when scope is `timeline_client`; INSERT/UPDATE IHARC; DELETE admin.
- **core.person_conditions**: SELECT/INSERT/UPDATE limited to emails in view `v_person_condition_authorized`; DELETE limited to supervisor/admin roles.
- **core.person_death_details**: staff-only read/write; admin-only delete.
- **core.user_people**: ALL allowed to the linked user_id; SELECT also allowed to users with grants on the person.
- **core.organization_people / organizations**: IHARC for CRUD; delete requires organizations.delete permission or iharc_admin.
- **portal.profiles**: self/service_role; org-admin restricted to same org; portal/iharc admins have full access.
- **portal.profile_contacts**: self/service_role only for all commands.
- **portal.registration_flows**: public INSERT with flow_type guard; no SELECT policy (non-staff cannot read flows via RLS).
- **case_mgmt.client_intakes**: SELECT/INSERT/UPDATE require is_iharc_user.
- **case_mgmt.incident_people / incident_person_medical**: policy `ALL true` (no restriction) — broad access.
- **portal.volunteer_* tables**: admin-only (`check_iharc_admin_role()` for ALL commands).

# Gaps / ambiguities
- Incident participants/medical tables are wide-open (`policy ALL true`), unlike other PII tables; may need tighter RLS aligned to people grants or IHARC role.
- Registration flows lack SELECT policies; reading submissions likely limited to service_role or blocked unintentionally—clarify intended reviewer access.
- profile_invites/profile_contacts/profile data depend on portal/current_profile_id helpers; verify behavior for service_role and org-admin in app logic.
- person_access_grants scopes cover consent management, but no explicit RLS on client_intakes/registration_flows uses these scopes—confirm if intended.
- Additional schemas (hazmat, justice, donations, inventory, audit, public) not reviewed for onboarding relevance; they may have people/org cross-links not surfaced here.
