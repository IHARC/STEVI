import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveOrgWorkspaceNav } from '@/lib/portal-access';
import { AdminShell } from '@/components/shells/admin-shell';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace) {
    redirect('/home');
  }

  const nav = resolveOrgWorkspaceNav(access);
  if (!nav) {
    redirect('/home');
  }

  return <AdminShell nav={nav}>{children}</AdminShell>;
}
