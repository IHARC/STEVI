import { redirect } from 'next/navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { Badge } from '@shared/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ContentInventoryPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Reports"
        title="Content inventory"
        description="Inventory of published pages, resources, and policies. This report is in progress; data connectors will land next."
        meta={[{ label: 'Coming soon', tone: 'warning' }]}
        breadcrumbs={[{ label: 'Reports', href: '/admin/operations' }, { label: 'Content inventory' }]}
      />

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Content inventory report</CardTitle>
          <CardDescription>We’re wiring metrics and export here. Until then, use Website & Brand tabs for detailed content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This placeholder keeps the nav route non-orphaned and aligned with the Visit-first IA.</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Website & Brand</Badge>
            <Badge variant="outline">Policies</Badge>
            <Badge variant="outline">Resources</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
