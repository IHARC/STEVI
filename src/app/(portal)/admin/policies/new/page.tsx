import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PolicyForm } from '@/app/(portal)/admin/policies/policy-form';
import { createPolicy } from '@/app/(portal)/admin/policies/actions';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Button } from '@/components/ui/button';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export default async function NewPolicyPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/policies/new');
  }

  if (!access.canManagePolicies) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-space-xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Policies</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Create a policy</h1>
          <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
            Publish policies that surface on the public transparency hub. Status controls visibility; published items
            appear immediately after save.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/admin/policies">Back</Link>
        </Button>
      </header>

      <PolicyForm mode="create" action={createPolicy} />
    </div>
  );
}
