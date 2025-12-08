import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-areas';

export const dynamic = 'force-dynamic';

export default async function RootRedirectPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const access = await loadPortalAccess(supabase);
  const destination = resolveLandingPath(access);
  redirect(destination);
}
