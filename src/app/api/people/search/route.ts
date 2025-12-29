import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { PERSON_TYPE_VALUES } from '@/lib/clients/directory';

const MAX_RESULTS = 20;

function parsePersonTypes(raw: string | null): Array<(typeof PERSON_TYPE_VALUES)[number]> {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is (typeof PERSON_TYPE_VALUES)[number] =>
      PERSON_TYPE_VALUES.includes(value as (typeof PERSON_TYPE_VALUES)[number]),
    );
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  const types = parsePersonTypes(searchParams.get('types'));

  if (!query || query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const canSearch = access.canAccessOpsFrontline || access.canManageConsents || access.canAccessOpsAdmin || access.canAccessOpsOrg;
  if (!canSearch) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: MAX_RESULTS,
    p_search_term: query,
    p_person_types: types.length ? types : null,
    p_person_category: null,
    p_status: null,
    p_sort_by: 'created_at',
    p_sort_order: 'DESC',
  });

  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((row: Record<string, unknown>) => {
      const id = Number(row.id);
      const first = typeof row.first_name === 'string' ? row.first_name : '';
      const last = typeof row.last_name === 'string' ? row.last_name : '';
      const label = `${first} ${last}`.trim() || `Person ${id}`;
      return {
        id,
        label,
        personType: row.person_type ?? null,
        personCategory: row.person_category ?? null,
      };
    }),
  });
}
