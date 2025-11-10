import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shells/portal-shell';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolvePortalNavLinks, type PortalLink } from '@/lib/portal-access';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);
  const navLinks: PortalLink[] = resolvePortalNavLinks(portalAccess);

  return (
    <PortalAccessProvider access={portalAccess}>
      <PortalShell navLinks={navLinks} portalAccess={portalAccess}>
        {children}
      </PortalShell>
    </PortalAccessProvider>
  );
}
