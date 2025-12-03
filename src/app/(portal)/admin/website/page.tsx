import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminWebsiteResourcesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace || !access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Website"
        title="Public resources"
        description="Manage the public-facing resource library mirrored to the marketing site. Keep content WCAG-compliant and sanitized before publishing."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Wire this stub to Supabase resources intended for public display. Ensure published content is sanitized and revalidated for the marketing app.</p>
          <p>Add cache invalidation and webhook triggers so marketing surfaces stay in sync.</p>
        </CardContent>
      </Card>
    </div>
  );
}
