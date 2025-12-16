import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function OpsSuppliesDonationsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/supplies/donations');
  }

  if (!access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const q = getString(resolvedParams, 'q');
  const status = getString(resolvedParams, 'status');
  const sort = getString(resolvedParams, 'sort');
  const page = getString(resolvedParams, 'page');
  const pageSize = getString(resolvedParams, 'pageSize');

  const params = new URLSearchParams();
  params.set('tab', 'donations');
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (sort) params.set('sort', sort);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);

  redirect(`/ops/supplies?${params.toString()}`);
}
