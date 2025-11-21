import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { listResources, RESOURCE_KIND_LABELS } from '@/lib/resources';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const publishedDateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });
const updatedDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatPublishedDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  try {
    return publishedDateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function formatUpdatedDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  try {
    return updatedDateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function parsePageParam(raw: string | string[] | undefined): number {
  if (!raw) return 1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildPageHref(page: number) {
  const search = page > 1 ? `?page=${page}` : '';
  return `/admin/resources${search}`;
}

function PaginationControls({ page, totalPages, hasMore }: { page: number; totalPages: number; hasMore: boolean }) {
  if (totalPages <= 1 && !hasMore) {
    return null;
  }

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages || hasMore ? page + 1 : null;

  return (
    <nav
      aria-label="Resource pagination"
      className="flex flex-wrap items-center justify-between gap-space-sm rounded-2xl border border-outline/20 bg-surface-container p-space-sm text-body-sm text-on-surface"
    >
      <span className="text-label-sm text-muted-foreground">
        Page {page} of {totalPages} {hasMore ? '+' : ''}
      </span>
      <div className="flex items-center gap-space-xs">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={!prevPage}
          aria-disabled={!prevPage}
        >
          <Link href={prevPage ? buildPageHref(prevPage) : '#'} prefetch>
            ← Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={!nextPage}
          aria-disabled={!nextPage}
        >
          <Link href={nextPage ? buildPageHref(nextPage) : '#'} prefetch>
            Next →
          </Link>
        </Button>
      </div>
    </nav>
  );
}

const PAGE_SIZE = 50;

export default async function AdminResourcesPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/resources');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    redirect('/home');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  if (!profile) {
    redirect('/home');
  }

  const page = parsePageParam(resolvedParams?.page);
  const resourceResult = await listResources({}, { includeUnpublished: true, page, pageSize: PAGE_SIZE });
  const resources = resourceResult.items;
  const publishedCount = resources.filter((entry) => entry.isPublished).length;
  const draftCount = resources.length - publishedCount;
  const totalPages = Math.max(1, Math.ceil(resourceResult.total / resourceResult.pageSize));

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-space-xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Resource library</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">
            Manage public resources and reports
          </h1>
          <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
            Publish outreach reports, policy updates, and community resources. Published items power the marketing
            website and client resource hub, while drafts stay internal until you are ready to share them.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/resources/new">Create resource</Link>
        </Button>
      </header>

      <section className="grid gap-space-md sm:grid-cols-2">
        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle className="text-body-lg text-muted-foreground">Published resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-headline-md font-semibold text-on-surface">{publishedCount}</p>
            <p className="text-label-sm text-muted-foreground">
              Visible on <span className="font-medium text-on-surface">iharc.ca</span> and the STEVI client portal.
            </p>
          </CardContent>
        </Card>
        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle className="text-body-lg text-muted-foreground">Draft resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-headline-md font-semibold text-on-surface">{draftCount}</p>
            <p className="text-label-sm text-muted-foreground">
              Only visible to STEVI admins until you publish them.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-space-md">
        {resourceResult.hasMore ? (
          <p className="text-body-sm text-muted-foreground">
            Showing {resources.length} of {resourceResult.total} resources. Use pagination to browse the full library.
          </p>
        ) : null}

        <PaginationControls page={page} totalPages={totalPages} hasMore={resourceResult.hasMore} />

        {resources.length === 0 ? (
          <Card className="border-outline/20 bg-surface-container">
            <CardHeader>
              <CardTitle className="text-title-sm text-on-surface">No resources yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-body-md text-muted-foreground">
              <p>
                Start by publishing a delegation summary, policy brief, or outreach update. Resources you publish here
                are shared with neighbours and partner agencies through both STEVI and the public site.
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/resources/new">Create your first resource</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-3xl border border-outline/20 bg-surface-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id} className="bg-transparent">
                    <TableCell>
                      <div className="flex flex-col gap-space-2xs">
                        <span className="font-medium text-on-surface">{resource.title}</span>
                        <span className="text-label-sm text-muted-foreground">/{resource.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{RESOURCE_KIND_LABELS[resource.kind]}</Badge>
                    </TableCell>
                    <TableCell>
                      {resource.isPublished ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                    </TableCell>
                    <TableCell>{formatPublishedDate(resource.datePublished)}</TableCell>
                    <TableCell>{formatUpdatedDate(resource.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-space-xs">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/resources/${resource.slug}`}>Edit</Link>
                        </Button>
                        {resource.isPublished ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-on-surface"
                          >
                            <Link
                              href={`https://iharc.ca/resources/${resource.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} hasMore={resourceResult.hasMore} />
      </section>
    </div>
  );
}
