import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const { portalAccess, landingPath } = await getPortalRequestContext();
  if (!portalAccess.canAccessOrgWorkspace) {
    redirect(landingPath);
  }

  return <>{children}</>;
}
