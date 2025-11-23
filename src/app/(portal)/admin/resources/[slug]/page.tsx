import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { ResourceForm } from '../resource-form';
import { deleteResourcePage, updateResourcePage } from '../actions';
import { getResourceBySlug } from '@/lib/resources';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminResourceEditPage({ params }: { params: RouteParams }) {
  const resolved = await params;
  const slugParam = resolved.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  if (!slug) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/admin/resources/${slug}`);
  }

  if (!access.canManageResources) {
    redirect('/home');
  }

  await ensurePortalProfile(supabase, access.userId);
  const resource = await getResourceBySlug(slug, { includeUnpublished: true });
  if (!resource) {
    notFound();
  }

  return (
    <div className="page-shell page-stack text-on-surface">
      <div className="mx-auto w-full max-w-[min(100%,52rem)] space-y-space-sm">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/admin/resources">← Back to admin resources</Link>
        </Button>
        <div>
          <h1 className="text-headline-lg">Edit resource</h1>
          <p className="text-body-sm text-on-surface/70">
            Update the public summary, embed new files, or adjust publishing status. Changes apply as soon as you save.
          </p>
        </div>
      </div>

      <Card className="mx-auto w-full max-w-[min(100%,52rem)]">
        <CardHeader className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-title-lg">{resource.title}</CardTitle>
            <CardDescription>
              {resource.isPublished ? 'Currently visible on the marketing site.' : 'Draft — not yet visible publicly.'}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/resources/${resource.slug}`} target="_blank" rel="noreferrer">
              View public page
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-space-lg">
          <ResourceForm
            mode="edit"
            action={updateResourcePage}
            onDeleteAction={deleteResourcePage}
            resource={resource}
          />
        </CardContent>
      </Card>
    </div>
  );
}
