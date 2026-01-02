-- Encounter observations + promotion + referrals

-- 1) Enum definitions (idempotent)
DO $$ BEGIN
  CREATE TYPE case_mgmt.observation_category_enum AS ENUM (
    'health_concern',
    'safety_concern',
    'welfare_check',
    'housing_basic_needs',
    'relationship_social',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.observation_subject_enum AS ENUM (
    'this_client',
    'known_person',
    'named_unlinked',
    'unidentified'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.observation_lead_status_enum AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.observation_promotion_enum AS ENUM (
    'medical_episode',
    'safety_incident',
    'referral'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_mgmt.referral_status_enum AS ENUM (
    'open',
    'sent',
    'completed',
    'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Observations table
CREATE TABLE IF NOT EXISTS case_mgmt.observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  category case_mgmt.observation_category_enum NOT NULL,
  summary text NOT NULL,
  details text NULL,
  subject_type case_mgmt.observation_subject_enum NOT NULL DEFAULT 'this_client',
  subject_person_id bigint NULL REFERENCES core.people(id) ON DELETE SET NULL,
  subject_name text NULL,
  subject_description text NULL,
  last_seen_at timestamptz NULL,
  last_seen_location text NULL,
  reporter_person_id bigint NULL REFERENCES core.people(id) ON DELETE SET NULL,
  lead_status case_mgmt.observation_lead_status_enum NULL,
  lead_expires_at timestamptz NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT observations_subject_client_check CHECK (
    (subject_type = 'this_client' AND person_id IS NOT NULL AND subject_person_id IS NULL)
    OR subject_type <> 'this_client'
  ),
  CONSTRAINT observations_subject_known_check CHECK (
    (subject_type = 'known_person' AND subject_person_id IS NOT NULL AND person_id = subject_person_id)
    OR subject_type <> 'known_person'
  ),
  CONSTRAINT observations_subject_named_check CHECK (
    (subject_type = 'named_unlinked' AND person_id IS NULL AND subject_person_id IS NULL AND subject_name IS NOT NULL)
    OR subject_type <> 'named_unlinked'
  ),
  CONSTRAINT observations_subject_unidentified_check CHECK (
    (subject_type = 'unidentified' AND person_id IS NULL AND subject_person_id IS NULL AND subject_description IS NOT NULL)
    OR subject_type <> 'unidentified'
  ),
  CONSTRAINT observations_visibility_third_party_check CHECK (
    (subject_type = 'this_client' AND visibility_scope IN ('internal_to_org', 'shared_via_consent'))
    OR (subject_type <> 'this_client' AND visibility_scope = 'internal_to_org')
  ),
  CONSTRAINT observations_lead_status_required CHECK (
    (subject_type IN ('named_unlinked', 'unidentified') AND lead_status IS NOT NULL AND lead_expires_at IS NOT NULL)
    OR (subject_type NOT IN ('named_unlinked', 'unidentified') AND lead_status IS NULL AND lead_expires_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS observations_person_recorded_idx ON case_mgmt.observations(person_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS observations_subject_person_idx ON case_mgmt.observations(subject_person_id);
CREATE INDEX IF NOT EXISTS observations_encounter_recorded_idx ON case_mgmt.observations(encounter_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS observations_org_recorded_idx ON case_mgmt.observations(owning_org_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS observations_lead_status_idx ON case_mgmt.observations(lead_status, lead_expires_at);

-- 3) Promotion tracking
CREATE TABLE IF NOT EXISTS case_mgmt.observation_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES case_mgmt.observations(id) ON DELETE CASCADE,
  promotion_type case_mgmt.observation_promotion_enum NOT NULL,
  target_id text NOT NULL,
  target_label text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  UNIQUE(observation_id, promotion_type, target_id)
);

CREATE INDEX IF NOT EXISTS observation_promotions_observation_idx ON case_mgmt.observation_promotions(observation_id);
CREATE INDEX IF NOT EXISTS observation_promotions_type_idx ON case_mgmt.observation_promotions(promotion_type);

-- 4) Referral records (minimal)
CREATE TABLE IF NOT EXISTS case_mgmt.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id bigint NOT NULL REFERENCES core.people(id) ON DELETE CASCADE,
  case_id bigint NULL REFERENCES case_mgmt.case_management(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES case_mgmt.encounters(id) ON DELETE SET NULL,
  owning_org_id bigint NOT NULL REFERENCES core.organizations(id) ON DELETE RESTRICT,
  referred_to_org_id bigint NULL REFERENCES core.organizations(id) ON DELETE SET NULL,
  referred_to_name text NULL,
  referral_status case_mgmt.referral_status_enum NOT NULL DEFAULT 'open',
  summary text NOT NULL,
  details text NULL,
  referred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_profile_id uuid NULL REFERENCES portal.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source core.record_source_enum NOT NULL DEFAULT 'staff_observed',
  verification_status core.verification_status_enum NOT NULL DEFAULT 'unverified',
  sensitivity_level core.sensitivity_level_enum NOT NULL DEFAULT 'standard',
  visibility_scope core.visibility_scope_enum NOT NULL DEFAULT 'internal_to_org',
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS referrals_person_recorded_idx ON case_mgmt.referrals(person_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS referrals_encounter_recorded_idx ON case_mgmt.referrals(encounter_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS referrals_org_recorded_idx ON case_mgmt.referrals(owning_org_id, recorded_at DESC);

-- 5) Sensitivity gate helper
CREATE OR REPLACE FUNCTION core.fn_observation_sensitivity_allowed(
  p_level core.sensitivity_level_enum,
  p_org_id bigint,
  p_user uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'core', 'portal', 'public'
AS $$
BEGIN
  IF p_user IS NULL THEN
    RETURN false;
  END IF;

  IF core.is_global_admin(p_user) THEN
    RETURN true;
  END IF;

  IF p_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_level IS NULL THEN
    RETURN false;
  END IF;

  IF p_level = 'standard' THEN
    RETURN true;
  END IF;

  IF p_level = 'sensitive' THEN
    RETURN core.has_org_permission(p_org_id, 'observations.read_sensitive', p_user);
  END IF;

  IF p_level IN ('high', 'restricted') THEN
    RETURN core.has_org_permission(p_org_id, 'observations.read_restricted', p_user);
  END IF;

  RETURN false;
END;
$$;

-- 6) RLS policies
ALTER TABLE case_mgmt.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.observation_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mgmt.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS observations_select_policy ON case_mgmt.observations;
CREATE POLICY observations_select_policy ON case_mgmt.observations
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR is_iharc_user()
  OR (
    subject_type = 'this_client'
    AND core.fn_observation_sensitivity_allowed(sensitivity_level, owning_org_id)
    AND EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = observations.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM core.user_people up
            WHERE up.person_id = p.id
              AND up.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id::bigint, auth.uid()))
              )
              AND (
                (g.scope = 'timeline_client' AND observations.visibility_scope = 'shared_via_consent')
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
  )
  OR (
    subject_type <> 'this_client'
    AND portal.actor_is_approved()
    AND portal.actor_org_id() IS NOT NULL
    AND owning_org_id = portal.actor_org_id()
    AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
    AND core.fn_observation_sensitivity_allowed(sensitivity_level, portal.actor_org_id())
    AND (
      person_id IS NULL
      OR core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
);

DROP POLICY IF EXISTS observations_insert_policy ON case_mgmt.observations;
CREATE POLICY observations_insert_policy ON case_mgmt.observations
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
    AND core.fn_observation_sensitivity_allowed(sensitivity_level, portal.actor_org_id())
    AND (
      (subject_type IN ('this_client', 'known_person') AND person_id IS NOT NULL AND core.fn_person_consent_allows_org(person_id, portal.actor_org_id()))
      OR (subject_type IN ('named_unlinked', 'unidentified') AND person_id IS NULL)
    )
  )
);

DROP POLICY IF EXISTS observations_update_policy ON case_mgmt.observations;
CREATE POLICY observations_update_policy ON case_mgmt.observations
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
    AND core.fn_observation_sensitivity_allowed(sensitivity_level, portal.actor_org_id())
    AND (
      person_id IS NULL
      OR core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
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
    AND core.fn_observation_sensitivity_allowed(sensitivity_level, portal.actor_org_id())
    AND (
      person_id IS NULL
      OR core.fn_person_consent_allows_org(person_id, portal.actor_org_id())
    )
  )
);

DROP POLICY IF EXISTS observations_delete_policy ON case_mgmt.observations;
CREATE POLICY observations_delete_policy ON case_mgmt.observations
FOR DELETE
USING (core.is_global_admin());

DROP POLICY IF EXISTS observation_promotions_select_policy ON case_mgmt.observation_promotions;
CREATE POLICY observation_promotions_select_policy ON case_mgmt.observation_promotions
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR EXISTS (
    SELECT 1
    FROM case_mgmt.observations o
    WHERE o.id = observation_promotions.observation_id
      AND (
        (o.subject_type = 'this_client' AND core.fn_observation_sensitivity_allowed(o.sensitivity_level, o.owning_org_id))
        OR (o.subject_type <> 'this_client' AND portal.actor_org_id() = o.owning_org_id AND core.fn_observation_sensitivity_allowed(o.sensitivity_level, o.owning_org_id))
      )
  )
);

DROP POLICY IF EXISTS observation_promotions_insert_policy ON case_mgmt.observation_promotions;
CREATE POLICY observation_promotions_insert_policy ON case_mgmt.observation_promotions
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR (
    portal.actor_is_approved()
    AND portal.actor_org_id() IS NOT NULL
    AND core.has_org_permission(portal.actor_org_id(), 'observations.promote', auth.uid())
    AND EXISTS (
      SELECT 1
      FROM case_mgmt.observations o
      WHERE o.id = observation_promotions.observation_id
        AND o.owning_org_id = portal.actor_org_id()
        AND core.fn_observation_sensitivity_allowed(o.sensitivity_level, portal.actor_org_id())
    )
  )
);

DROP POLICY IF EXISTS observation_promotions_update_policy ON case_mgmt.observation_promotions;
CREATE POLICY observation_promotions_update_policy ON case_mgmt.observation_promotions
FOR UPDATE
USING (core.is_global_admin())
WITH CHECK (core.is_global_admin());

DROP POLICY IF EXISTS observation_promotions_delete_policy ON case_mgmt.observation_promotions;
CREATE POLICY observation_promotions_delete_policy ON case_mgmt.observation_promotions
FOR DELETE
USING (core.is_global_admin());

DROP POLICY IF EXISTS referrals_select_policy ON case_mgmt.referrals;
CREATE POLICY referrals_select_policy ON case_mgmt.referrals
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR is_iharc_user()
  OR EXISTS (
    SELECT 1
    FROM core.people p
    WHERE p.id = referrals.person_id
      AND (
        p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM core.user_people up
          WHERE up.person_id = p.id
            AND up.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM core.person_access_grants g
          WHERE g.person_id = p.id
            AND (
              g.grantee_user_id = auth.uid()
              OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id::bigint, auth.uid()))
            )
            AND (
              (g.scope = 'timeline_client' AND referrals.visibility_scope = 'shared_via_consent')
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

DROP POLICY IF EXISTS referrals_insert_policy ON case_mgmt.referrals;
CREATE POLICY referrals_insert_policy ON case_mgmt.referrals
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

DROP POLICY IF EXISTS referrals_update_policy ON case_mgmt.referrals;
CREATE POLICY referrals_update_policy ON case_mgmt.referrals
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

DROP POLICY IF EXISTS referrals_delete_policy ON case_mgmt.referrals;
CREATE POLICY referrals_delete_policy ON case_mgmt.referrals
FOR DELETE
USING (core.is_global_admin());

-- 7) Timeline projection for observations + referrals
CREATE OR REPLACE FUNCTION core.timeline_from_observation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
BEGIN
  v_event_at := COALESCE(new.recorded_at, now());

  IF new.person_id IS NULL THEN
    RETURN new;
  END IF;

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'observation',
      event_at = v_event_at,
      source_type = 'observation',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = new.summary,
      metadata = jsonb_build_object(
        'category', new.category,
        'source', new.source,
        'verification_status', new.verification_status,
        'subject_type', new.subject_type,
        'subject_name', new.subject_name,
        'subject_description', new.subject_description,
        'last_seen_at', new.last_seen_at,
        'last_seen_location', new.last_seen_location
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'observation'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
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
      'observation',
      v_event_at,
      'observation',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      new.summary,
      jsonb_build_object(
        'category', new.category,
        'source', new.source,
        'verification_status', new.verification_status,
        'subject_type', new.subject_type,
        'subject_name', new.subject_name,
        'subject_description', new.subject_description,
        'last_seen_at', new.last_seen_at,
        'last_seen_location', new.last_seen_location
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_observations_timeline ON case_mgmt.observations;
CREATE TRIGGER trg_observations_timeline
  AFTER INSERT OR UPDATE ON case_mgmt.observations
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_observation();

DROP TRIGGER IF EXISTS trg_observations_timeline_delete ON case_mgmt.observations;
CREATE TRIGGER trg_observations_timeline_delete
  AFTER DELETE ON case_mgmt.observations
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('observation');

CREATE OR REPLACE FUNCTION core.timeline_from_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'case_mgmt', 'portal', 'public'
AS $$
DECLARE
  v_event_at timestamptz;
BEGIN
  v_event_at := COALESCE(new.referred_at, new.recorded_at, now());

  UPDATE core.timeline_events
  SET person_id = new.person_id,
      case_id = new.case_id,
      encounter_id = new.encounter_id,
      owning_org_id = new.owning_org_id,
      event_category = 'referral',
      event_at = v_event_at,
      source_type = 'referral',
      source_id = new.id::text,
      visibility_scope = new.visibility_scope,
      sensitivity_level = new.sensitivity_level,
      summary = new.summary,
      metadata = jsonb_build_object(
        'referral_status', new.referral_status,
        'referred_to_org_id', new.referred_to_org_id,
        'referred_to_name', new.referred_to_name
      ),
      recorded_by_profile_id = new.recorded_by_profile_id,
      created_by = new.created_by
  WHERE source_type = 'referral'
    AND source_id = new.id::text;

  IF NOT FOUND THEN
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
      'referral',
      v_event_at,
      'referral',
      new.id::text,
      new.visibility_scope,
      new.sensitivity_level,
      new.summary,
      jsonb_build_object(
        'referral_status', new.referral_status,
        'referred_to_org_id', new.referred_to_org_id,
        'referred_to_name', new.referred_to_name
      ),
      new.recorded_by_profile_id,
      new.created_by
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_referrals_timeline ON case_mgmt.referrals;
CREATE TRIGGER trg_referrals_timeline
  AFTER INSERT OR UPDATE ON case_mgmt.referrals
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_from_referral();

DROP TRIGGER IF EXISTS trg_referrals_timeline_delete ON case_mgmt.referrals;
CREATE TRIGGER trg_referrals_timeline_delete
  AFTER DELETE ON case_mgmt.referrals
  FOR EACH ROW
  EXECUTE FUNCTION core.timeline_delete_for_source('referral');

-- 8) Update timeline select policy to enforce third-party restrictions + sensitivity for observations
DROP POLICY IF EXISTS timeline_events_select_policy ON core.timeline_events;
CREATE POLICY timeline_events_select_policy ON core.timeline_events
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR is_iharc_user()
  OR (
    EXISTS (
      SELECT 1
      FROM core.people p
      WHERE p.id = timeline_events.person_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM core.user_people up
            WHERE up.person_id = p.id
              AND up.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM core.person_access_grants g
            WHERE g.person_id = p.id
              AND (
                g.grantee_user_id = auth.uid()
                OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id::bigint, auth.uid()))
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
    AND (
      timeline_events.event_category <> 'observation'
      OR core.fn_observation_sensitivity_allowed(timeline_events.sensitivity_level, timeline_events.owning_org_id)
    )
    AND (
      timeline_events.event_category <> 'observation'
      OR COALESCE(timeline_events.metadata->>'subject_type', 'this_client') = 'this_client'
      OR (portal.actor_org_id() IS NOT NULL AND timeline_events.owning_org_id = portal.actor_org_id())
    )
  )
);

-- 9) Permissions for sensitivity + promotion
INSERT INTO core.permissions (name, description, domain, category, created_by, updated_by)
VALUES
  ('observations.read_sensitive', 'Access sensitive observation records', 'observations', 'observations', null, null),
  ('observations.read_restricted', 'Access high/restricted observation records', 'observations', 'observations', null, null),
  ('observations.promote', 'Promote observations into incidents, medical episodes, or referrals', 'observations', 'observations', null, null)
ON CONFLICT (name) DO NOTHING;

WITH permission_map AS (
  SELECT 'iharc_staff'::text AS template_name, 'observations.read_sensitive'::text AS permission_name UNION ALL
  SELECT 'iharc_staff', 'observations.promote' UNION ALL
  SELECT 'iharc_supervisor', 'observations.read_sensitive' UNION ALL
  SELECT 'iharc_supervisor', 'observations.read_restricted' UNION ALL
  SELECT 'iharc_supervisor', 'observations.promote' UNION ALL
  SELECT 'org_admin', 'observations.read_sensitive' UNION ALL
  SELECT 'org_admin', 'observations.read_restricted' UNION ALL
  SELECT 'org_admin', 'observations.promote' UNION ALL
  SELECT 'org_member', 'observations.read_sensitive' UNION ALL
  SELECT 'org_member', 'observations.promote' UNION ALL
  SELECT 'org_rep', 'observations.read_sensitive' UNION ALL
  SELECT 'org_rep', 'observations.promote'
)
INSERT INTO core.role_template_permissions (template_id, permission_id, created_at, updated_at)
SELECT rt.id, p.id, now(), now()
FROM permission_map pm
JOIN core.role_templates rt ON rt.name = pm.template_name
JOIN core.permissions p ON p.name = pm.permission_name
ON CONFLICT DO NOTHING;

WITH permission_map AS (
  SELECT 'iharc_staff'::text AS template_name, 'observations.read_sensitive'::text AS permission_name UNION ALL
  SELECT 'iharc_staff', 'observations.promote' UNION ALL
  SELECT 'iharc_supervisor', 'observations.read_sensitive' UNION ALL
  SELECT 'iharc_supervisor', 'observations.read_restricted' UNION ALL
  SELECT 'iharc_supervisor', 'observations.promote' UNION ALL
  SELECT 'org_admin', 'observations.read_sensitive' UNION ALL
  SELECT 'org_admin', 'observations.read_restricted' UNION ALL
  SELECT 'org_admin', 'observations.promote' UNION ALL
  SELECT 'org_member', 'observations.read_sensitive' UNION ALL
  SELECT 'org_member', 'observations.promote' UNION ALL
  SELECT 'org_rep', 'observations.read_sensitive' UNION ALL
  SELECT 'org_rep', 'observations.promote'
)
INSERT INTO core.org_role_permissions (org_role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, now(), now()
FROM permission_map pm
JOIN core.role_templates rt ON rt.name = pm.template_name
JOIN core.org_roles r ON r.template_id = rt.id
JOIN core.permissions p ON p.name = pm.permission_name
ON CONFLICT DO NOTHING;
