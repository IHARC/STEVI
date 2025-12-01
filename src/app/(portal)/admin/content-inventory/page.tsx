import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { WorkspacePageHeader } from '@/components/layout/workspace-page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ContentInventoryPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace || !access.canManageWebsiteContent) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  return (
    <div className="page-shell page-stack">
      <WorkspacePageHeader
        eyebrow="Website"
        title="Content inventory"
        description="Audit public-facing pages, resources, and policies so the marketing site stays accurate."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Use this view to inventory navigation, resources, and policies with owners and review dates.</p>
          <p>When implementing, include cache revalidation hooks for the marketing app and record all edits in the audit log.</p>
        </CardContent>
      </Card>
    </div>
  );
}
