import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';

const MAX_RESULTS = 20;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  const scope = (searchParams.get('scope') ?? 'client').trim(); // client | staff

  if (!query || query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // Only allow admins, IHARC staff, or org admins to search.
  const canAdmin = access.canAccessAdminWorkspace;
  const canOrg = access.canAccessOrgWorkspace;
  const canStaff = access.canAccessStaffWorkspace;

  if (!canAdmin && !canOrg && !canStaff) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Ensure profile exists for audit consistency.
  await ensurePortalProfile(supabase, access.userId);

  const portal = supabase.schema('portal');

  const queryBuilder = portal
    .from('profiles')
    .select('id, display_name, organization_id, affiliation_type')
    .ilike('display_name', `%${query}%`)
    .order('display_name')
    .limit(MAX_RESULTS);

  if (!canAdmin && access.organizationId) {
    queryBuilder.eq('organization_id', access.organizationId);
  }

  if (scope === 'client') {
    queryBuilder.eq('affiliation_type', 'community_member');
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((row: { id: string; display_name: string; organization_id: number | null }) => ({
      id: row.id,
      label: row.display_name,
      organizationId: row.organization_id,
    })),
  });
}
