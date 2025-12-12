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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Website & Marketing"
        description="Manage public-facing content that powers iharc.ca."
        primaryAction={{ label: 'Back to general settings', href: '/ops/admin' }}
      />

      <AdminTabs />
      <WebsiteTabs />

      <div className="space-y-6">{children}</div>
    </div>
  );
}
