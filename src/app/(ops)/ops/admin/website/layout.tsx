import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@shared/layout/page-header';
import { AdminTabs } from '../admin-tabs';
import { WebsiteTabs } from './website-tabs';

export const dynamic = 'force-dynamic';

export default async function WebsiteAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/admin/website/branding');
  }

  if (!access.canManageWebsiteContent) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Website & Marketing"
        description="Manage public-facing content that powers iharc.ca."
        primaryAction={{ label: 'Back to general settings', href: '/ops/admin' }}
      />

      <AdminTabs />
      <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
        <WebsiteTabs />
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
