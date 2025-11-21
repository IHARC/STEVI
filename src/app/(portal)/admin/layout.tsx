import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveAdminWorkspaceNav } from '@/lib/portal-access';
import { AdminShell } from '@/components/shells/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect('/home');
  }

  const adminNav = resolveAdminWorkspaceNav(access);
  if (!adminNav) {
    redirect('/home');
  }

  return <AdminShell nav={adminNav}>{children}</AdminShell>;
}
