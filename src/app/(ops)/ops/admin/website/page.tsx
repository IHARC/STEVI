import { PageHeader } from '@shared/layout/page-header';
import { AdminTabs } from '../admin-tabs';
import {
  WebsiteBrandingPanel,
  WebsiteFooterPanel,
  WebsiteHomePanel,
  WebsiteNavigationPanel,
  WebsiteProgramsPanel,
  WebsiteSupportsPanel,
  buildWebsiteContext,
} from './panels';

export const dynamic = 'force-dynamic';

export default async function AdminWebsitePage() {
  const { supabase, access } = await buildWebsiteContext();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Website & Marketing"
        description="Update public branding, navigation, and marketing content."
        primaryAction={{ label: 'Back to overview', href: '/ops/admin' }}
      />

      <AdminTabs />

      <div className="space-y-6">
        <WebsiteBrandingPanel supabase={supabase} access={access} />
        <WebsiteNavigationPanel supabase={supabase} access={access} />
        <WebsiteHomePanel supabase={supabase} access={access} />
        <WebsiteSupportsPanel supabase={supabase} access={access} />
        <WebsiteProgramsPanel supabase={supabase} access={access} />
        <WebsiteFooterPanel supabase={supabase} access={access} />
      </div>
    </div>
  );
}

