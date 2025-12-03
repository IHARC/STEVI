import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ServiceRulesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const elevatedAdmin =
    access.isProfileApproved &&
    (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin'));

  if (!elevatedAdmin) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Service rules & algorithms"
        description="Document allocation logic, prioritisation, and routing algorithms that guide STEVI operations."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Use this space to expose the decision logic used across scheduling, outreach, and case routing.</p>
          <p>When wiring data, keep an audit trail for rule edits and ensure WCAG-compliant formatting.</p>
        </CardContent>
      </Card>
    </div>
  );
}
