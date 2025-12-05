import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { listPolicies, formatPolicyCategoryLabel } from '@/lib/policies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { resolveLandingPath } from '@/lib/portal-navigation';

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
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const policies = await listPolicies({ includeUnpublished: true });
  const publishedCount = policies.filter((p) => p.isPublished).length;
  const draftCount = policies.filter((p) => p.status === 'draft').length;
  const archivedCount = policies.filter((p) => p.status === 'archived').length;

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Policies & procedures</p>
          <h1 className="text-xl text-foreground sm:text-2xl">Manage public-facing policies</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Create, edit, and publish IHARC policies that appear on the public transparency hub. Status controls
            visibility: published policies are automatically visible on marketing pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/policies/new">Create policy</Link>
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{publishedCount}</p>
            <p className="text-xs text-muted-foreground">Visible on the marketing site.</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{draftCount}</p>
            <p className="text-xs text-muted-foreground">Not visible to the public.</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{archivedCount}</p>
            <p className="text-xs text-muted-foreground">Kept for reference; hidden from marketing pages.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {policies.length === 0 ? (
          <Card className="border-border/40 bg-card">
            <CardHeader>
              <CardTitle className="text-base text-foreground">No policies yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Add your first policy to populate the transparency hub.</p>
              <Button asChild variant="outline">
                <Link href="/admin/policies/new">Create policy</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-3xl border border-border/40 bg-card">
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
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{policy.title}</span>
                        <span className="text-xs text-muted-foreground">/{policy.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatPolicyCategoryLabel(policy.category)}</Badge>
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
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/policies/${policy.slug}`}>Edit</Link>
                        </Button>
                        {policy.isPublished ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
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
