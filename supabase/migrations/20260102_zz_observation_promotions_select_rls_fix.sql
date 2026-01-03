-- Tighten observation_promotions SELECT RLS to mirror observation access rules

DROP POLICY IF EXISTS observation_promotions_select_policy ON case_mgmt.observation_promotions;
CREATE POLICY observation_promotions_select_policy ON case_mgmt.observation_promotions
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR core.is_global_admin()
  OR is_iharc_user()
  OR EXISTS (
    SELECT 1
    FROM case_mgmt.observations o
    WHERE o.id = observation_promotions.observation_id
      AND (
        (
          o.subject_type = 'this_client'
          AND core.fn_observation_sensitivity_allowed(o.sensitivity_level, o.owning_org_id)
          AND EXISTS (
            SELECT 1
            FROM core.people p
            WHERE p.id = o.person_id
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
                      (g.scope = 'timeline_client' AND o.visibility_scope = 'shared_via_consent')
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
          o.subject_type <> 'this_client'
          AND portal.actor_is_approved()
          AND portal.actor_org_id() IS NOT NULL
          AND o.owning_org_id = portal.actor_org_id()
          AND core.has_org_permission(portal.actor_org_id(), 'portal.access_frontline', auth.uid())
          AND core.fn_observation_sensitivity_allowed(o.sensitivity_level, portal.actor_org_id())
          AND (
            o.person_id IS NULL
            OR core.fn_person_consent_allows_org(o.person_id, portal.actor_org_id())
          )
        )
      )
  )
);
