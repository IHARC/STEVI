-- Align cost_event_dimensions select policy with cost_events access rules

DROP POLICY IF EXISTS cost_event_dimensions_select_policy ON core.cost_event_dimensions;
CREATE POLICY cost_event_dimensions_select_policy ON core.cost_event_dimensions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM core.cost_events ce
      WHERE ce.id = cost_event_dimensions.cost_event_id
        AND (
          core.is_global_admin()
          OR is_iharc_user()
          OR (
            ce.organization_id = portal.actor_org_id()
            AND (
              public.has_permission_single('cost.view')
              OR public.has_permission_single('cost.report')
              OR public.has_permission_single('cost.manage')
              OR public.has_permission_single('cost.admin')
            )
          )
          OR (
            ce.person_id IS NOT NULL
            AND (
              public.has_permission_single('cost.view')
              OR public.has_permission_single('cost.report')
              OR public.has_permission_single('cost.manage')
              OR public.has_permission_single('cost.admin')
            )
            AND EXISTS (
              SELECT 1
              FROM core.person_access_grants g
              WHERE g.person_id = ce.person_id
                AND (
                  g.grantee_user_id = auth.uid()
                  OR (g.grantee_org_id IS NOT NULL AND core.is_org_member(g.grantee_org_id, auth.uid()))
                )
                AND (g.expires_at IS NULL OR g.expires_at > now())
                AND (
                  (g.grantee_user_id = auth.uid() AND portal.actor_org_id() IS NULL)
                  OR core.fn_person_consent_allows_org(ce.person_id, portal.actor_org_id())
                )
            )
          )
        )
    )
  );
