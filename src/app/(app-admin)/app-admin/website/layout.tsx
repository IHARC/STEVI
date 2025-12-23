import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@shared/layout/page-header';

export const dynamic = 'force-dynamic';

export default async function WebsiteAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/app-admin/website/branding');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Website & Marketing"
        description="Manage public-facing content that powers iharc.ca."
        breadcrumbs={[{ label: 'STEVI Admin', href: '/app-admin' }, { label: 'Website & marketing' }]}
      />

      <div className="space-y-6">{children}</div>
    </div>
  );
}
