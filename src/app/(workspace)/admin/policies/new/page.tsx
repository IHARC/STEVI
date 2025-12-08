import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PolicyForm } from '@/app/(workspace)/admin/policies/policy-form';
import { createPolicy } from '@/app/(workspace)/admin/policies/actions';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { Button } from '@shared/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchPolicyEnumOptions } from '@/lib/policies';

export default async function NewPolicyPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/policies/new');
  }

  if (!access.canManagePolicies) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const enumOptions = await fetchPolicyEnumOptions();
  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Policies</p>
          <h1 className="text-xl text-foreground sm:text-2xl">Create a policy</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Publish policies that surface on the public transparency hub. Status controls visibility; published items
            appear immediately after save.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/admin/policies">Back</Link>
        </Button>
      </header>

      <PolicyForm mode="create" action={createPolicy} statusOptions={enumOptions.statuses} categoryOptions={enumOptions.categories} />
    </div>
  );
}
