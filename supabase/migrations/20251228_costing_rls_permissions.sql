-- Align cost event RLS + secure views with required cost permissions

-- Cost events select policy: require cost permissions for person-grant access
DROP POLICY IF EXISTS cost_events_select_policy ON core.cost_events;
CREATE POLICY cost_events_select_policy ON core.cost_events
  FOR SELECT
  USING (
    core.is_global_admin()
    OR is_iharc_user()
    OR (
      organization_id = portal.actor_org_id()
      AND (
        public.has_permission_single('cost.view')
        OR public.has_permission_single('cost.report')
        OR public.has_permission_single('cost.manage')
        OR public.has_permission_single('cost.admin')
      )
    )
    OR (
      person_id IS NOT NULL
      AND (
        public.has_permission_single('cost.view')
        OR public.has_permission_single('cost.report')
        OR public.has_permission_single('cost.manage')
        OR public.has_permission_single('cost.admin')
      )
      AND EXISTS (
        SELECT 1
        FROM core.person_access_grants g
        WHERE g.person_id = cost_events.person_id
          AND (
            g.grantee_user_id = auth.uid()
            OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
          )
          AND (g.expires_at IS NULL OR g.expires_at > now())
          AND (
            (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
            OR core.fn_person_consent_allows_org(cost_events.person_id, portal.actor_org_id())
          )
      )
    )
  );

-- Secure views: require cost permissions for person-grant access
CREATE OR REPLACE VIEW analytics.cost_event_daily_secure
WITH (security_barrier = true) AS
SELECT *
FROM analytics.cost_event_daily
WHERE
  core.is_global_admin()
  OR is_iharc_user()
  OR (
    organization_id = portal.actor_org_id()
    AND (
      public.has_permission_single('cost.view')
      OR public.has_permission_single('cost.report')
      OR public.has_permission_single('cost.manage')
      OR public.has_permission_single('cost.admin')
    )
  )
  OR (
    person_id IS NOT NULL
    AND (
      public.has_permission_single('cost.view')
      OR public.has_permission_single('cost.report')
      OR public.has_permission_single('cost.manage')
      OR public.has_permission_single('cost.admin')
    )
    AND EXISTS (
      SELECT 1
      FROM core.person_access_grants g
      WHERE g.person_id = analytics.cost_event_daily.person_id
        AND (
          g.grantee_user_id = auth.uid()
          OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        AND (g.expires_at IS NULL OR g.expires_at > now())
        AND (
          (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
          OR core.fn_person_consent_allows_org(analytics.cost_event_daily.person_id, portal.actor_org_id())
        )
    )
  );

CREATE OR REPLACE VIEW analytics.person_cost_rollups_secure
WITH (security_barrier = true) AS
SELECT *
FROM analytics.person_cost_rollups
WHERE
  core.is_global_admin()
  OR is_iharc_user()
  OR (
    organization_id = portal.actor_org_id()
    AND (
      public.has_permission_single('cost.view')
      OR public.has_permission_single('cost.report')
      OR public.has_permission_single('cost.manage')
      OR public.has_permission_single('cost.admin')
    )
  )
  OR (
    person_id IS NOT NULL
    AND (
      public.has_permission_single('cost.view')
      OR public.has_permission_single('cost.report')
      OR public.has_permission_single('cost.manage')
      OR public.has_permission_single('cost.admin')
    )
    AND EXISTS (
      SELECT 1
      FROM core.person_access_grants g
      WHERE g.person_id = analytics.person_cost_rollups.person_id
        AND (
          g.grantee_user_id = auth.uid()
          OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
        )
        AND (g.expires_at IS NULL OR g.expires_at > now())
        AND (
          (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
          OR core.fn_person_consent_allows_org(analytics.person_cost_rollups.person_id, portal.actor_org_id())
        )
    )
  );
