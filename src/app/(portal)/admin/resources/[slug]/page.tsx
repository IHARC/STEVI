import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  if (profile.role !== 'admin') {
    redirect('/portal/ideas');
  }

  const resource = await getResourceBySlug(slug, { includeUnpublished: true });
  if (!resource) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 text-on-surface">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/command-center/admin?tab=resources">← Back to admin resources</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Edit resource</h1>
          <p className="text-sm text-on-surface/70">
            Update the public summary, embed new files, or adjust publishing status. Changes apply as soon as you save.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{resource.title}</CardTitle>
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
        <CardContent className="space-y-8">
          <ResourceForm
            mode="edit"
            profileId={profile.id}
            action={updateResourcePage}
            onDeleteAction={deleteResourcePage}
            resource={resource}
          />
        </CardContent>
      </Card>
    </div>
  );
}
