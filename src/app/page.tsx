import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

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
  const destination = resolveDefaultWorkspacePath(access);
  redirect(destination);
}
