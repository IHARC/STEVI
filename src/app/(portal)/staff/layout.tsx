import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { portalAccess, defaultWorkspacePath } = await getPortalRequestContext();
  if (!portalAccess.canAccessStaffWorkspace) {
    redirect(defaultWorkspacePath);
  }

  return <>{children}</>;
}
