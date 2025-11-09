import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolvePortalNavLinks } from '@/lib/portal-access';
import { PortalNavClient } from '@/components/layout/portal-nav-client';

export async function PortalNav() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const links = resolvePortalNavLinks(access);

  if (links.length === 0) {
    return null;
  }

  return <PortalNavClient links={links} />;
}
