import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { requireArea } from '@/lib/portal-areas';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { portalAccess, landingPath, currentPath } = await getPortalRequestContext();
  const accessCheck = requireArea(portalAccess, 'admin', { currentPath, landingPath });
  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  return <>{children}</>;
}
