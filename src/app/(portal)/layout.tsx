import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shells/portal-shell';
import { headers } from 'next/headers';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveClientNavLinks, type PortalLink } from '@/lib/portal-access';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);
  const navLinks: PortalLink[] = resolveClientNavLinks(portalAccess);
  const headerList = await headers();
  const currentPath = headerList.get('next-url') ?? headerList.get('x-invoke-path') ?? '';
  const isAdminPath = currentPath.includes('/admin');
  const isOrgPath = currentPath.includes('/org');

  return (
    <PortalAccessProvider access={portalAccess}>
      <PortalShell
        navLinks={navLinks}
        portalAccess={portalAccess}
        showClientNav={!isAdminPath && !isOrgPath}
      >
        {children}
      </PortalShell>
    </PortalAccessProvider>
  );
}
