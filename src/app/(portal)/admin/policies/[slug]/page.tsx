import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { PolicyForm } from '@/app/(portal)/admin/policies/policy-form';
import { deletePolicy, updatePolicy } from '@/app/(portal)/admin/policies/actions';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { getPolicyBySlug } from '@/lib/policies';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PolicyDetailPage({ params }: { params: RouteParams }) {
  const resolved = await params;
  const slugParam = resolved.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/admin/policies/${slug}`);
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    redirect('/home');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const policy = await getPolicyBySlug(slug, { includeUnpublished: true });
  if (!policy) {
    notFound();
  }

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-space-xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Policies</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Edit policy</h1>
          <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
            Update public copy, categories, and publication status. Publishing makes this policy visible on the marketing site after cache refresh.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/admin/policies">Back</Link>
        </Button>
      </header>

      <PolicyForm
        mode="edit"
        action={updatePolicy}
        onDeleteAction={deletePolicy}
        policy={policy}
      />
    </div>
  );
}
