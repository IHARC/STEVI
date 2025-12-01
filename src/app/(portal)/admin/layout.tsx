import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { portalAccess, defaultWorkspacePath } = await getPortalRequestContext();
  if (!portalAccess.canAccessAdminWorkspace) {
    redirect(defaultWorkspacePath);
  }

  return <>{children}</>;
}
