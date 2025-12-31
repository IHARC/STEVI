-- Client record foundation: encounters, tasks, timeline projection, domain refactors

-- 1) Enum definitions (idempotent)
DO $$ BEGIN
  CREATE TYPE core.timeline_event_category_enum AS ENUM (
    'encounter',
    'task',
    'referral',
    'supply',
    'appointment',
    'note',
    'client_update',
    'intake',
    'medical',
    'justice',
    'relationship',
    'characteristic',
    'consent',
    'system',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.record_source_enum AS ENUM (
    'client_reported',
    'staff_observed',
    'document',
    'partner_org',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.verification_status_enum AS ENUM (
    'unverified',
    'verified',
    'disputed',
    'stale'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.sensitivity_level_enum AS ENUM (
    'standard',
    'sensitive',
    'high',
    'restricted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.visibility_scope_enum AS ENUM (
    'internal_to_org',
    'shared_via_consent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.justice_episode_type_enum AS ENUM (
    'arrest',
    'charge',
    'court',
    'probation',
    'parole',
    'warrant',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.encounter_type_enum AS ENUM (
    'outreach',
    'intake',
    'program',
    'appointment',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.task_status_enum AS ENUM (
    'open',
    'in_progress',
    'blocked',
    'done',
    'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.task_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend cost source enum for encounter-driven costing
DO $$ BEGIN
  ALTER TYPE core.cost_source_type_enum ADD VALUE IF NOT EXISTS 'encounter';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 2) New tables
CREATE TABLE IF NOT EXISTS case_mgmt.encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  encounter_type case_mgmt.encounter_type_enum NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  location_context text NULL,
  program_context text NULL,
  summary text NULL,
  notes text NULL,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS encounters_person_started_idx ON case_mgmt.encounters(person_id, started_at DESC);
CREATE INDEX IF NOT EXISTS encounters_org_started_idx ON case_mgmt.encounters(owning_org_id, started_at DESC);

CREATE TABLE IF NOT EXISTS case_mgmt.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  assigned_to_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  status case_mgmt.task_status_enum NOT NULL DEFAULT 'open',
  priority case_mgmt.task_priority_enum NOT NULL DEFAULT 'normal',
  due_at timestamptz NULL,
  title text NOT NULL,
  description text NULL,
  source_type text NULL,
  source_id text NULL,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS tasks_assignee_status_due_idx ON case_mgmt.tasks(assigned_to_profile_id, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_person_status_idx ON case_mgmt.tasks(person_id, status);

CREATE TABLE IF NOT EXISTS core.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  event_category core.timeline_event_category_enum NOT NULL,
  event_at timestamptz NOT NULL,
  source_type text NULL,
  source_id text NULL,
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  summary text NULL,
  metadata jsonb NULL,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS timeline_events_person_event_idx ON core.timeline_events(person_id, event_at DESC);
CREATE INDEX IF NOT EXISTS timeline_events_org_event_idx ON core.timeline_events(owning_org_id, event_at DESC);
CREATE INDEX IF NOT EXISTS timeline_events_source_idx ON core.timeline_events(source_type, source_id);

CREATE TABLE IF NOT EXISTS core.justice_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  episode_type core.justice_episode_type_enum NOT NULL,
  event_date date NOT NULL DEFAULT current_date,
  event_time time NULL,
  agency text NULL,
  case_number text NULL,
  charges text NULL,
  disposition text NULL,
  location text NULL,
  bail_amount numeric NULL,
  booking_number text NULL,
  release_date date NULL,
  release_type text NULL,
  court_date date NULL,
  supervision_agency text NULL,
  notes text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS justice_episodes_person_event_idx ON core.justice_episodes(person_id, event_date DESC);

CREATE TABLE IF NOT EXISTS core.person_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  related_person_id bigint NULL REFERENCES core.people(id) ON DELETE SET NULL,
  relationship_type text NOT NULL,
  relationship_subtype text NULL,
  relationship_status text NULL,
  start_date date NULL,
  end_date date NULL,
  contact_name text NULL,
  contact_phone text NULL,
  contact_email text NULL,
  contact_address text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  safe_to_contact boolean NOT NULL DEFAULT true,
  safe_contact_notes text NULL,
  notes text NULL,
  metadata jsonb NULL,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT person_relationships_contact_check CHECK (
    related_person_id IS NOT NULL OR contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_email IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS person_relationships_person_idx ON core.person_relationships(person_id);

CREATE TABLE IF NOT EXISTS core.person_characteristics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  observed_at timestamptz NOT NULL DEFAULT now(),
  observed_by text NULL,
  characteristic_type text NOT NULL,
  value_text text NULL,
  value_number numeric NULL,
  value_unit text NULL,
  body_location text NULL,
  notes text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS person_characteristics_person_idx ON core.person_characteristics(person_id, observed_at DESC);

-- 3) Schema refactors
ALTER TABLE case_mgmt.case_management
  ADD COLUMN IF NOT EXISTS owning_org_id bigint;

UPDATE case_mgmt.case_management
SET owning_org_id = core.get_iharc_org_id()
WHERE owning_org_id IS NULL;

ALTER TABLE case_mgmt.case_management
  ALTER COLUMN owning_org_id SET NOT NULL;

ALTER TABLE case_mgmt.case_management
  ADD CONSTRAINT case_management_owning_org_fkey
  FOREIGN KEY (owning_org_id) REFERENCES core.organizations(id) ON DELETE RESTRICT;

ALTER TABLE core.medical_episodes
  ADD COLUMN IF NOT EXISTS case_id bigint,
  ADD COLUMN IF NOT EXISTS encounter_id uuid,
  ADD COLUMN IF NOT EXISTS owning_org_id bigint,
  ADD COLUMN IF NOT EXISTS recorded_by_profile_id uuid,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS source core.record_source_enum,
  ADD COLUMN IF NOT EXISTS verification_status core.verification_status_enum,
  ADD COLUMN IF NOT EXISTS sensitivity_level core.sensitivity_level_enum,
  ADD COLUMN IF NOT EXISTS visibility_scope core.visibility_scope_enum;

UPDATE core.medical_episodes
SET owning_org_id = COALESCE(owning_org_id, core.get_iharc_org_id()),
    recorded_at = COALESCE(recorded_at, created_at, now()),
    source = COALESCE(source, 'staff_observed'),
    verification_status = COALESCE(verification_status, 'unverified'),
    sensitivity_level = COALESCE(sensitivity_level, 'standard'),
    visibility_scope = COALESCE(visibility_scope, 'internal_to_org');

ALTER TABLE core.medical_episodes
  ALTER COLUMN owning_org_id SET NOT NULL,
  ALTER COLUMN recorded_at SET NOT NULL,
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN verification_status SET NOT NULL,
  ALTER COLUMN sensitivity_level SET NOT NULL,
  ALTER COLUMN visibility_scope SET NOT NULL;

ALTER TABLE core.medical_episodes
  ADD CONSTRAINT medical_episodes_case_fkey FOREIGN KEY (case_id) REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  ADD CONSTRAINT medical_episodes_encounter_fkey FOREIGN KEY (encounter_id) REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  ADD CONSTRAINT medical_episodes_owning_org_fkey FOREIGN KEY (owning_org_id) REFERENCES core.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT medical_episodes_recorded_by_profile_fkey FOREIGN KEY (recorded_by_profile_id) REFERENCES portal.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS medical_episodes_person_recorded_idx ON core.medical_episodes(person_id, recorded_at DESC);

ALTER TABLE inventory.distributions
  ADD COLUMN IF NOT EXISTS encounter_id uuid;

ALTER TABLE inventory.distributions
  ADD CONSTRAINT distributions_encounter_fkey
  FOREIGN KEY (encounter_id) REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL;

-- 4) Enable RLS for new tables
ALTER TABLE case_mgmt.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.justice_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.person_characteristics ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies

-- Encounters
DROP POLICY IF EXISTS encounters_select_policy ON case_mgmt.encounters;
DROP POLICY IF EXISTS encounters_insert_policy ON case_mgmt.encounters;
DROP POLICY IF EXISTS encounters_update_policy ON case_mgmt.encounters;
DROP POLICY IF EXISTS encounters_delete_policy ON case_mgmt.encounters;

CREATE POLICY encounters_select_policy ON case_mgmt.encounters
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = encounters.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM core.user_people up
            WHERE up.person_id = p.id AND up.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND encounters.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY encounters_insert_policy ON case_mgmt.encounters
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY encounters_update_policy ON case_mgmt.encounters
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY encounters_delete_policy ON case_mgmt.encounters
  FOR DELETE
  USING (
    core.is_global_admin()
  );

-- Tasks
DROP POLICY IF EXISTS tasks_select_policy ON case_mgmt.tasks;
DROP POLICY IF EXISTS tasks_insert_policy ON case_mgmt.tasks;
DROP POLICY IF EXISTS tasks_update_policy ON case_mgmt.tasks;
DROP POLICY IF EXISTS tasks_delete_policy ON case_mgmt.tasks;

CREATE POLICY tasks_select_policy ON case_mgmt.tasks
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = tasks.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM core.user_people up
            WHERE up.person_id = p.id AND up.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND tasks.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY tasks_insert_policy ON case_mgmt.tasks
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY tasks_update_policy ON case_mgmt.tasks
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY tasks_delete_policy ON case_mgmt.tasks
  FOR DELETE
  USING (core.is_global_admin());

-- Timeline events
DROP POLICY IF EXISTS timeline_events_select_policy ON core.timeline_events;
DROP POLICY IF EXISTS timeline_events_insert_policy ON core.timeline_events;
DROP POLICY IF EXISTS timeline_events_update_policy ON core.timeline_events;
DROP POLICY IF EXISTS timeline_events_delete_policy ON core.timeline_events;

CREATE POLICY timeline_events_select_policy ON core.timeline_events
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = timeline_events.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM core.user_people up
            WHERE up.person_id = p.id AND up.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND timeline_events.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY timeline_events_insert_policy ON core.timeline_events
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
    OR (
      portal.actor_org_id() IS NULL
      AND EXISTS (
        SELECT 1 FROM core.user_people up
        WHERE up.person_id = timeline_events.person_id AND up.user_id = auth.uid()
      )
      AND event_category = 'client_update'
      AND visibility_scope = 'shared_via_consent'
      AND source_type = 'client_update'
    )
  );

CREATE POLICY timeline_events_update_policy ON core.timeline_events
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY timeline_events_delete_policy ON core.timeline_events
  FOR DELETE
  USING (core.is_global_admin());

-- Justice episodes
DROP POLICY IF EXISTS justice_episodes_select_policy ON core.justice_episodes;
DROP POLICY IF EXISTS justice_episodes_insert_policy ON core.justice_episodes;
DROP POLICY IF EXISTS justice_episodes_update_policy ON core.justice_episodes;
DROP POLICY IF EXISTS justice_episodes_delete_policy ON core.justice_episodes;

CREATE POLICY justice_episodes_select_policy ON core.justice_episodes
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = justice_episodes.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM core.user_people up WHERE up.person_id = p.id AND up.user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND justice_episodes.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY justice_episodes_insert_policy ON core.justice_episodes
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY justice_episodes_update_policy ON core.justice_episodes
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY justice_episodes_delete_policy ON core.justice_episodes
  FOR DELETE
  USING (core.is_global_admin());

-- Person relationships
DROP POLICY IF EXISTS person_relationships_select_policy ON core.person_relationships;
DROP POLICY IF EXISTS person_relationships_insert_policy ON core.person_relationships;
DROP POLICY IF EXISTS person_relationships_update_policy ON core.person_relationships;
DROP POLICY IF EXISTS person_relationships_delete_policy ON core.person_relationships;

CREATE POLICY person_relationships_select_policy ON core.person_relationships
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = person_relationships.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM core.user_people up WHERE up.person_id = p.id AND up.user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND person_relationships.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY person_relationships_insert_policy ON core.person_relationships
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY person_relationships_update_policy ON core.person_relationships
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY person_relationships_delete_policy ON core.person_relationships
  FOR DELETE
  USING (core.is_global_admin());

-- Person characteristics
DROP POLICY IF EXISTS person_characteristics_select_policy ON core.person_characteristics;
DROP POLICY IF EXISTS person_characteristics_insert_policy ON core.person_characteristics;
DROP POLICY IF EXISTS person_characteristics_update_policy ON core.person_characteristics;
DROP POLICY IF EXISTS person_characteristics_delete_policy ON core.person_characteristics;

CREATE POLICY person_characteristics_select_policy ON core.person_characteristics
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = person_characteristics.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM core.user_people up WHERE up.person_id = p.id AND up.user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND person_characteristics.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY person_characteristics_insert_policy ON core.person_characteristics
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY person_characteristics_update_policy ON core.person_characteristics
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY person_characteristics_delete_policy ON core.person_characteristics
  FOR DELETE
  USING (core.is_global_admin());

-- Medical episodes (replace IHARC-only policies)
DROP POLICY IF EXISTS medical_episodes_select_policy ON core.medical_episodes;
DROP POLICY IF EXISTS medical_episodes_insert_policy ON core.medical_episodes;
DROP POLICY IF EXISTS medical_episodes_update_policy ON core.medical_episodes;
DROP POLICY IF EXISTS medical_episodes_delete_policy ON core.medical_episodes;

CREATE POLICY medical_episodes_select_policy ON core.medical_episodes
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = medical_episodes.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM core.user_people up WHERE up.person_id = p.id AND up.user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND medical_episodes.visibility_scope = 'shared_via_consent')
                OR g.scope = ANY (ARRAY['timeline_full', 'write_notes'])
              )
              AND (g.expires_at IS NULL OR g.expires_at > now())
              AND (
                (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                OR core.fn_person_consent_allows_org(p.id, portal.actor_org_id())
              )
          )
        )
    )
  );

CREATE POLICY medical_episodes_insert_policy ON core.medical_episodes
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY medical_episodes_update_policy ON core.medical_episodes
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR core.is_global_admin()
    OR is_iharc_user()
    OR (
      portal.actor_is_approved()
      AND portal.actor_org_id() IS NOT NULL
      AND owning_org_id = portal.actor_org_id()
      AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
      AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  );

CREATE POLICY medical_episodes_delete_policy ON core.medical_episodes
  FOR DELETE
  USING (core.is_global_admin());

-- 6) Timeline projection triggers
CREATE OR REPLACE FUNCTION core.timeline_from_encounter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := COALESCE(new.summary, initcap(replace(new.encounter_type::text, '_', ' ')) || ' encounter');

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.id,
    new.owning_org_id,
    'encounter',
    new.started_at,
    'encounter',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    v_summary,
    jsonb_build_object(
      'encounter_type', new.encounter_type,
      'location_context', new.location_context,
      'program_context', new.program_context,
      'notes', new.notes
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_encounters_timeline ON case_mgmt.encounters;
CREATE TRIGGER trg_encounters_timeline
  AFTER INSERT ON case_mgmt.encounters
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_encounter();

CREATE OR REPLACE FUNCTION core.timeline_from_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
BEGIN
  v_event_at := COALESCE(new.due_at, new.recorded_at, now());

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.encounter_id,
    new.owning_org_id,
    'task',
    v_event_at,
    'task',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    new.title,
    jsonb_build_object(
      'status', new.status,
      'priority', new.priority,
      'due_at', new.due_at,
      'assigned_to_profile_id', new.assigned_to_profile_id
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_timeline ON case_mgmt.tasks;
CREATE TRIGGER trg_tasks_timeline
  AFTER INSERT ON case_mgmt.tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_task();

CREATE OR REPLACE FUNCTION core.timeline_from_medical_episode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
  v_summary text;
BEGIN
  v_event_at := COALESCE(new.recorded_at, new.episode_datetime, new.episode_date::timestamptz, now());
  v_summary := COALESCE(new.assessment_summary, new.primary_condition, new.episode_type);

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.encounter_id,
    new.owning_org_id,
    'medical',
    v_event_at,
    'medical_episode',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    v_summary,
    jsonb_build_object(
      'episode_type', new.episode_type,
      'follow_up_needed', new.follow_up_needed
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_episodes_timeline ON core.medical_episodes;
CREATE TRIGGER trg_medical_episodes_timeline
  AFTER INSERT ON core.medical_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_medical_episode();

CREATE OR REPLACE FUNCTION core.timeline_from_justice_episode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
  v_summary text;
BEGIN
  v_event_at := COALESCE((new.event_date::date + COALESCE(new.event_time, '00:00:00')::time)::timestamptz, new.recorded_at, now());
  v_summary := COALESCE(new.charges, initcap(replace(new.episode_type::text, '_', ' ')));

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.encounter_id,
    new.owning_org_id,
    'justice',
    v_event_at,
    'justice_episode',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    v_summary,
    jsonb_build_object(
      'episode_type', new.episode_type,
      'court_date', new.court_date
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_justice_episodes_timeline ON core.justice_episodes;
CREATE TRIGGER trg_justice_episodes_timeline
  AFTER INSERT ON core.justice_episodes
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_justice_episode();

CREATE OR REPLACE FUNCTION core.timeline_from_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := COALESCE(new.contact_name, 'Relationship') || ' (' || new.relationship_type || ')';

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.encounter_id,
    new.owning_org_id,
    'relationship',
    new.recorded_at,
    'person_relationship',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    v_summary,
    jsonb_build_object(
      'relationship_type', new.relationship_type,
      'is_emergency', new.is_emergency
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_relationships_timeline ON core.person_relationships;
CREATE TRIGGER trg_person_relationships_timeline
  AFTER INSERT ON core.person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_relationship();

CREATE OR REPLACE FUNCTION core.timeline_from_characteristic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  v_summary := new.characteristic_type;

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    new.person_id,
    new.case_id,
    new.encounter_id,
    new.owning_org_id,
    'characteristic',
    new.observed_at,
    'person_characteristic',
    new.id::text,
    new.visibility_scope,
    new.sensitivity_level,
    v_summary,
    jsonb_build_object(
      'value_text', new.value_text,
      'value_number', new.value_number,
      'value_unit', new.value_unit
    ),
    new.recorded_by_profile_id,
    new.created_by
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_characteristics_timeline ON core.person_characteristics;
CREATE TRIGGER trg_person_characteristics_timeline
  AFTER INSERT ON core.person_characteristics
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_characteristic();

CREATE OR REPLACE FUNCTION core.timeline_from_distribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'inventory', 'portal', 'public'
AS $$
BEGIN
  IF new.person_id IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata
  ) VALUES (
    new.person_id,
    NULL,
    new.encounter_id,
    COALESCE(new.provider_org_id, core.get_iharc_org_id()),
    'supply',
    new.created_at,
    'distribution',
    new.id::text,
    'internal_to_org',
    'standard',
    'Supply distribution',
    jsonb_build_object(
      'location_id', new.location_id,
      'notes', new.notes
    )
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_distributions_timeline ON inventory.distributions;
CREATE TRIGGER trg_inventory_distributions_timeline
  AFTER INSERT ON inventory.distributions
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_distribution();

CREATE OR REPLACE FUNCTION core.timeline_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_person_id bigint;
  v_event_at timestamptz;
BEGIN
  SELECT up.person_id
  INTO v_person_id
  FROM core.user_people up
  WHERE up.profile_id = new.client_profile_id
  ORDER BY up.linked_at DESC
  LIMIT 1;

  IF v_person_id IS NULL THEN
    RETURN new;
  END IF;

  v_event_at := COALESCE(new.occurs_at, new.created_at, now());

  INSERT INTO core.timeline_events (
    person_id,
    case_id,
    encounter_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    source_id,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id
  ) VALUES (
    v_person_id,
    NULL,
    NULL,
    COALESCE(new.organization_id, core.get_iharc_org_id()),
    'appointment',
    v_event_at,
    'appointment',
    new.id::text,
    'shared_via_consent',
    'standard',
    COALESCE(new.title, 'Appointment'),
    jsonb_build_object(
      'status', new.status,
      'location_type', new.location_type
    ),
    new.requester_profile_id
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_timeline ON portal.appointments;
CREATE TRIGGER trg_appointments_timeline
  AFTER INSERT ON portal.appointments
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_appointment();

-- 7) Migrations from legacy data
INSERT INTO core.timeline_events (
  person_id,
  case_id,
  encounter_id,
  owning_org_id,
  event_category,
  event_at,
  source_type,
  source_id,
  visibility_scope,
  sensitivity_level,
  summary,
  metadata,
  recorded_by_profile_id,
  created_by
)
SELECT
  pa.person_id,
  CASE
    WHEN (pa.metadata->>'case_id') ~ '^[0-9]+$' THEN (pa.metadata->>'case_id')::bigint
    ELSE NULL
  END,
  NULL,
  COALESCE(pa.provider_org_id, core.get_iharc_org_id()),
  CASE
    WHEN pa.activity_type IN ('visit', 'contact', 'welfare_check', 'incident') THEN 'encounter'
    WHEN pa.activity_type IN ('task', 'follow_up') THEN 'task'
    WHEN pa.activity_type IN ('service_referral') THEN 'referral'
    WHEN pa.activity_type IN ('supply_provision') THEN 'supply'
    WHEN pa.activity_type IN ('appointment') THEN 'appointment'
    WHEN pa.activity_type IN ('note') THEN 'note'
    WHEN pa.activity_type IN ('intake') THEN 'intake'
    WHEN pa.activity_type IN ('client_update') THEN 'client_update'
    WHEN pa.activity_type IN ('consent_contact') THEN 'consent'
    ELSE 'other'
  END::core.timeline_event_category_enum,
  COALESCE((pa.activity_date::date + COALESCE(pa.activity_time, '00:00:00')::time)::timestamptz, pa.created_at, now()),
  'legacy_activity',
  pa.id::text,
  CASE
    WHEN COALESCE((pa.metadata->>'client_visible')::boolean, false) THEN 'shared_via_consent'
    ELSE 'internal_to_org'
  END::core.visibility_scope_enum,
  'standard'::core.sensitivity_level_enum,
  COALESCE(pa.title, pa.activity_type),
  jsonb_build_object(
    'legacy_activity_type', pa.activity_type,
    'description', pa.description,
    'location', pa.location,
    'metadata', pa.metadata
  ),
  pa.provider_profile_id,
  pa.created_by
FROM core.people_activities pa;

INSERT INTO core.justice_episodes (
  person_id,
  case_id,
  encounter_id,
  owning_org_id,
  recorded_by_profile_id,
  recorded_at,
  source,
  verification_status,
  sensitivity_level,
  visibility_scope,
  episode_type,
  event_date,
  event_time,
  agency,
  case_number,
  charges,
  disposition,
  location,
  bail_amount,
  booking_number,
  release_date,
  release_type,
  notes,
  metadata,
  created_at,
  created_by
)
SELECT
  ah.person_id,
  NULL,
  NULL,
  core.get_iharc_org_id(),
  p.id,
  COALESCE(ah.created_at, now()),
  'staff_observed'::core.record_source_enum,
  CASE WHEN ah.created_by IS NOT NULL THEN 'verified' ELSE 'unverified' END::core.verification_status_enum,
  'standard'::core.sensitivity_level_enum,
  'internal_to_org'::core.visibility_scope_enum,
  'arrest'::core.justice_episode_type_enum,
  ah.arrest_date,
  ah.arrest_time,
  ah.arresting_agency,
  ah.case_number,
  ah.charges,
  ah.disposition,
  ah.location,
  ah.bail_amount,
  ah.booking_number,
  ah.release_date,
  ah.release_type,
  ah.notes,
  jsonb_build_object('legacy_arrest_id', ah.id),
  COALESCE(ah.created_at, now()),
  ah.created_by
FROM core.arrest_history ah
LEFT JOIN portal.profiles p ON p.user_id = ah.created_by;

INSERT INTO core.person_relationships (
  person_id,
  related_person_id,
  relationship_type,
  relationship_subtype,
  relationship_status,
  start_date,
  end_date,
  contact_name,
  contact_phone,
  contact_email,
  notes,
  metadata,
  owning_org_id,
  recorded_by_profile_id,
  recorded_at,
  source,
  verification_status,
  sensitivity_level,
  visibility_scope,
  created_at,
  created_by
)
SELECT
  pr.person1_id,
  pr.person2_id,
  pr.relationship_type,
  pr.relationship_subtype,
  pr.relationship_status,
  pr.start_date,
  pr.end_date,
  NULL,
  NULL,
  NULL,
  pr.notes,
  pr.metadata,
  core.get_iharc_org_id(),
  pp.id,
  COALESCE(pr.created_at, now()),
  'staff_observed'::core.record_source_enum,
  CASE WHEN pr.verified THEN 'verified' ELSE 'unverified' END::core.verification_status_enum,
  'standard'::core.sensitivity_level_enum,
  'internal_to_org'::core.visibility_scope_enum,
  pr.created_at,
  pr.created_by
FROM core.people_relationships pr
LEFT JOIN portal.profiles pp ON pp.user_id = pr.created_by;

INSERT INTO core.person_relationships (
  person_id,
  related_person_id,
  relationship_type,
  owning_org_id,
  recorded_at,
  source,
  verification_status,
  sensitivity_level,
  visibility_scope,
  created_at,
  created_by
)
SELECT
  p.id,
  p.related_person_id,
  COALESCE(p.relationship_to_client, 'related'),
  core.get_iharc_org_id(),
  now(),
  'staff_observed'::core.record_source_enum,
  'unverified'::core.verification_status_enum,
  'standard'::core.sensitivity_level_enum,
  'internal_to_org'::core.visibility_scope_enum,
  now(),
  p.created_by
FROM core.people p
WHERE p.related_person_id IS NOT NULL;

-- 8) Update core functions to new models
CREATE OR REPLACE FUNCTION core.staff_caseload(staff_uuid uuid)
RETURNS TABLE(person_id bigint, client_name text, status text, next_step text, next_at date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF staff_uuid IS NOT NULL AND staff_uuid <> auth.uid() THEN
    RAISE insufficient_privilege USING MESSAGE = 'staff_caseload is scoped to the current user';
  END IF;

  SELECT id INTO v_profile_id
  FROM portal.profiles
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (t.person_id)
    t.person_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Client') AS client_name,
    t.status::text AS status,
    t.title AS next_step,
    t.due_at::date AS next_at
  FROM case_mgmt.tasks t
  JOIN core.people p ON p.id = t.person_id
  WHERE t.assigned_to_profile_id = v_profile_id
    AND t.status IN ('open', 'in_progress', 'blocked')
  ORDER BY t.person_id, t.due_at ASC NULLS LAST, t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION core.staff_outreach_logs(staff_uuid uuid, limit_rows integer DEFAULT 20)
RETURNS TABLE(id uuid, title text, summary text, location text, occurred_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF staff_uuid IS NOT NULL AND staff_uuid <> auth.uid() THEN
    RAISE insufficient_privilege USING MESSAGE = 'staff_outreach_logs is scoped to the current user';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    COALESCE(e.summary, e.encounter_type::text) AS title,
    e.notes AS summary,
    e.location_context AS location,
    e.started_at AS occurred_at
  FROM case_mgmt.encounters e
  WHERE e.created_by = auth.uid()
    AND e.encounter_type = 'outreach'
  ORDER BY e.started_at DESC
  LIMIT COALESCE(limit_rows, 20);
END;
$$;

CREATE OR REPLACE FUNCTION core.log_consent_contact(p_person_id bigint, p_org_id bigint, p_summary text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_display_name text;
  v_summary text;
BEGIN
  IF p_person_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'Person and organization are required.';
  END IF;

  IF NOT portal.actor_is_approved() THEN
    RAISE EXCEPTION 'Profile approval required.';
  END IF;

  IF portal.actor_org_id() IS NULL OR portal.actor_org_id() <> p_org_id THEN
    RAISE EXCEPTION 'Contact org does not match acting org.';
  END IF;

  SELECT portal.current_profile_id() INTO v_profile_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile required to log consent contact.';
  END IF;

  SELECT display_name INTO v_display_name
  FROM portal.profiles
  WHERE id = v_profile_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Profile display name required.';
  END IF;

  v_summary := NULLIF(TRIM(p_summary), '');
  IF v_summary IS NULL THEN
    RAISE EXCEPTION 'Summary is required.';
  END IF;

  IF char_length(v_summary) > 240 THEN
    RAISE EXCEPTION 'Summary must be 240 characters or fewer.';
  END IF;

  INSERT INTO core.timeline_events (
    person_id,
    owning_org_id,
    event_category,
    event_at,
    source_type,
    visibility_scope,
    sensitivity_level,
    summary,
    metadata,
    recorded_by_profile_id,
    created_by
  ) VALUES (
    p_person_id,
    p_org_id,
    'consent',
    now(),
    'consent_contact',
    'internal_to_org',
    'standard',
    'Consent contact logged',
    jsonb_build_object(
      'summary', v_summary,
      'staff_member', v_display_name,
      'consent_contact', true
    ),
    v_profile_id,
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION inventory.distribute_items(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'inventory', 'core', 'donations', 'portal', 'public'
AS $$
DECLARE
  dist_id uuid := gen_random_uuid();
  _location uuid := (p_payload->>'location_id')::uuid;
  _client text := p_payload->>'client_id';
  _notes text := p_payload->>'notes';
  _provider_org_id bigint := null;
  _person_id bigint := null;
  _encounter_id uuid := null;
  _item jsonb;
  _item_id uuid;
  _qty integer;
  _batch uuid;
  _available integer;
  _unit_cost numeric;
BEGIN
  IF NOT is_iharc_user() THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for inventory.distribute';
  END IF;

  _provider_org_id := NULLIF(p_payload->>'provider_org_id', '')::bigint;
  _person_id := NULLIF(p_payload->>'person_id', '')::bigint;
  _encounter_id := NULLIF(p_payload->>'encounter_id', '')::uuid;

  IF _provider_org_id IS NULL THEN
    RAISE EXCEPTION 'Provider organization is required for distributions.';
  END IF;

  INSERT INTO inventory.distributions(id, client_id, location_id, notes, provider_org_id, person_id, encounter_id, created_by)
  VALUES (dist_id, _client, _location, _notes, _provider_org_id, _person_id, _encounter_id, auth.uid());

  FOR _item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    _item_id := (_item->>'item_id')::uuid;
    _qty := COALESCE((_item->>'qty')::integer, 0);
    _batch := NULLIF(_item->>'batch_id', '')::uuid;
    _unit_cost := NULLIF(_item->>'unit_cost', '')::numeric;

    IF _qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(qty), 0) INTO _available
    FROM inventory.inventory_transactions
    WHERE item_id = _item_id
      AND location_id = _location
      AND (_batch IS NULL OR batch_id = _batch);

    IF _available < _qty THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available %, requested %', _item_id, _available, _qty;
    END IF;

    INSERT INTO inventory.distribution_items(distribution_id, item_id, batch_id, qty, unit_cost, created_by)
    VALUES (dist_id, _item_id, _batch, _qty, _unit_cost, auth.uid());

    INSERT INTO inventory.inventory_transactions(
      item_id, location_id, batch_id, qty, unit_cost, reason_code, ref_type, ref_id, notes, provider_organization_id, created_by
    ) VALUES (
      _item_id, _location, _batch, -_qty, _unit_cost, 'distribution', 'distribution', dist_id, _notes, _provider_org_id, auth.uid()
    );
  END LOOP;

  RETURN dist_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_outreach_transaction(person_data jsonb, distribution_data jsonb, distribution_items jsonb[], activity_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'case_mgmt', 'core', 'inventory', 'portal'
AS $$
DECLARE
  new_distribution_id uuid;
  new_encounter_id uuid;
  item_data jsonb;
  result json;
  created_items_count integer := 0;
  inventory_transactions_count integer := 0;
  v_profile_id uuid;
  v_org_id bigint;
  v_started_at timestamptz;
BEGIN
  SELECT portal.current_profile_id() INTO v_profile_id;
  v_org_id := COALESCE(NULLIF(distribution_data->>'provider_org_id', '')::bigint, portal.actor_org_id());
  v_started_at := CASE
    WHEN (activity_data->>'activity_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      (activity_data->>'activity_date')::date + COALESCE((activity_data->>'activity_time')::time, '00:00:00'::time)
    ELSE now()::timestamp
  END;

  INSERT INTO case_mgmt.encounters (
    person_id,
    case_id,
    owning_org_id,
    encounter_type,
    started_at,
    location_context,
    program_context,
    summary,
    notes,
    recorded_by_profile_id,
    recorded_at,
    source,
    visibility_scope,
    created_by
  ) VALUES (
    (person_data->>'id')::bigint,
    CASE
      WHEN (activity_data->>'case_id') ~ '^[0-9]+$' THEN (activity_data->>'case_id')::bigint
      ELSE NULL
    END,
    COALESCE(v_org_id, core.get_iharc_org_id()),
    CASE
      WHEN (activity_data->>'activity_type') IN ('outreach', 'intake', 'program', 'appointment', 'other') THEN (activity_data->>'activity_type')::case_mgmt.encounter_type_enum
      WHEN (activity_data->>'activity_type') IN ('visit', 'contact', 'welfare_check', 'incident') THEN 'outreach'::case_mgmt.encounter_type_enum
      ELSE 'other'::case_mgmt.encounter_type_enum
    END,
    v_started_at,
    activity_data->>'location',
    activity_data->>'program_context',
    activity_data->>'title',
    activity_data->>'description',
    v_profile_id,
    now(),
    'staff_observed'::core.record_source_enum,
    'internal_to_org'::core.visibility_scope_enum,
    auth.uid()
  ) RETURNING id INTO new_encounter_id;

  INSERT INTO inventory.distributions (
    client_id,
    location_id,
    person_id,
    performed_by,
    notes,
    gps_latitude,
    gps_longitude,
    gps_accuracy,
    gps_timestamp,
    provider_org_id,
    encounter_id,
    created_by
  ) VALUES (
    (distribution_data->>'client_id')::text,
    (distribution_data->>'location_id')::uuid,
    (person_data->>'id')::integer,
    (distribution_data->>'performed_by')::uuid,
    (distribution_data->>'notes')::text,
    CASE
      WHEN distribution_data->>'gps_latitude' != '' AND distribution_data->>'gps_latitude' IS NOT NULL
      THEN (distribution_data->>'gps_latitude')::numeric
      ELSE NULL
    END,
    CASE
      WHEN distribution_data->>'gps_longitude' != '' AND distribution_data->>'gps_longitude' IS NOT NULL
      THEN (distribution_data->>'gps_longitude')::numeric
      ELSE NULL
    END,
    CASE
      WHEN distribution_data->>'gps_accuracy' != '' AND distribution_data->>'gps_accuracy' IS NOT NULL
      THEN (distribution_data->>'gps_accuracy')::numeric
      ELSE NULL
    END,
    CASE
      WHEN distribution_data->>'gps_timestamp' != '' AND distribution_data->>'gps_timestamp' IS NOT NULL
      THEN (distribution_data->>'gps_timestamp')::timestamptz
      ELSE NULL
    END,
    v_org_id,
    new_encounter_id,
    auth.uid()
  ) RETURNING id INTO new_distribution_id;

  FOREACH item_data IN ARRAY distribution_items
  LOOP
    INSERT INTO inventory.distribution_items (
      distribution_id,
      item_id,
      qty,
      batch_id,
      unit_cost,
      created_by
    ) VALUES (
      new_distribution_id,
      (item_data->>'item_id')::uuid,
      (item_data->>'quantity')::integer,
      CASE
        WHEN item_data->>'batch_id' != '' AND item_data->>'batch_id' IS NOT NULL
        THEN (item_data->>'batch_id')::uuid
        ELSE NULL
      END,
      COALESCE((item_data->>'unit_cost')::numeric, 0),
      auth.uid()
    );

    created_items_count := created_items_count + 1;

    INSERT INTO inventory.inventory_transactions (
      item_id,
      location_id,
      batch_id,
      qty,
      reason_code,
      ref_type,
      ref_id,
      notes,
      provider_organization_id,
      created_by
    ) VALUES (
      (item_data->>'item_id')::uuid,
      (distribution_data->>'location_id')::uuid,
      CASE
        WHEN item_data->>'batch_id' != '' AND item_data->>'batch_id' IS NOT NULL
        THEN (item_data->>'batch_id')::uuid
        ELSE NULL
      END,
      -((item_data->>'quantity')::integer),
      'distribution',
      'distribution',
      new_distribution_id,
      'Stock decrease due to outreach distribution',
      v_org_id,
      auth.uid()
    );

    inventory_transactions_count := inventory_transactions_count + 1;
  END LOOP;

  result := json_build_object(
    'success', true,
    'distribution_id', new_distribution_id,
    'encounter_id', new_encounter_id,
    'person_id', (person_data->>'id')::integer,
    'created_items_count', created_items_count,
    'inventory_transactions_count', inventory_transactions_count,
    'location_id', (distribution_data->>'location_id')::uuid
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- 9) Drop legacy structures after migration
DROP TABLE IF EXISTS core.arrest_history;
DROP TABLE IF EXISTS core.people_relationships;

ALTER TABLE core.people
  DROP COLUMN IF EXISTS related_person_id,
  DROP COLUMN IF EXISTS relationship_to_client;
