import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { listPolicies, POLICY_CATEGORY_LABELS } from '@/lib/policies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function AdminPoliciesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/policies');
  }

  if (!access.canManagePolicies) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const policies = await listPolicies({ includeUnpublished: true });
  const publishedCount = policies.filter((p) => p.isPublished).length;
  const draftCount = policies.filter((p) => p.status === 'draft').length;
  const archivedCount = policies.filter((p) => p.status === 'archived').length;

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-space-xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Policies & procedures</p>
          <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Manage public-facing policies</h1>
          <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
            Create, edit, and publish IHARC policies that appear on the public transparency hub. Status controls
            visibility: published policies are automatically visible on marketing pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/policies/new">Create policy</Link>
        </Button>
      </header>

      <section className="grid gap-space-md md:grid-cols-3">
        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle className="text-body-lg text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-headline-md font-semibold text-on-surface">{publishedCount}</p>
            <p className="text-label-sm text-muted-foreground">Visible on the marketing site.</p>
          </CardContent>
        </Card>
        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle className="text-body-lg text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-headline-md font-semibold text-on-surface">{draftCount}</p>
            <p className="text-label-sm text-muted-foreground">Not visible to the public.</p>
          </CardContent>
        </Card>
        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle className="text-body-lg text-muted-foreground">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-headline-md font-semibold text-on-surface">{archivedCount}</p>
            <p className="text-label-sm text-muted-foreground">Kept for reference; hidden from marketing pages.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-space-md">
        {policies.length === 0 ? (
          <Card className="border-outline/20 bg-surface-container">
            <CardHeader>
              <CardTitle className="text-title-sm text-on-surface">No policies yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-body-md text-muted-foreground">
              <p>Add your first policy to populate the transparency hub.</p>
              <Button asChild variant="outline">
                <Link href="/admin/policies/new">Create policy</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-3xl border border-outline/20 bg-surface-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id} className="bg-transparent">
                    <TableCell>
                      <div className="flex flex-col gap-space-2xs">
                        <span className="font-medium text-on-surface">{policy.title}</span>
                        <span className="text-label-sm text-muted-foreground">/{policy.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{POLICY_CATEGORY_LABELS[policy.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      {policy.status === 'published' ? (
                        <Badge>Published</Badge>
                      ) : policy.status === 'archived' ? (
                        <Badge variant="secondary">Archived</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(policy.lastReviewedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-space-xs">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/policies/${policy.slug}`}>Edit</Link>
                        </Button>
                        {policy.isPublished ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-on-surface"
                          >
                            <Link href={`https://iharc.ca/policies/${policy.slug}`} target="_blank" rel="noreferrer">
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
      </section>
    </div>
  );
}
