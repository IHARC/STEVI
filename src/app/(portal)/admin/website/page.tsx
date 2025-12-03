import {
  WebsiteBrandingPanel,
  WebsiteNavigationPanel,
  WebsiteHomePanel,
  WebsiteSupportsPanel,
  WebsiteProgramsPanel,
  WebsiteFooterPanel,
  WebsiteResourcesPanel,
  WebsiteContentInventoryPanel,
  buildWebsiteContext,
} from './panels';
import { PageTabNav } from '@/components/layout/page-tab-nav';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'branding', label: 'Branding', component: WebsiteBrandingPanel },
  { id: 'navigation', label: 'Navigation', component: WebsiteNavigationPanel },
  { id: 'home', label: 'Home & context', component: WebsiteHomePanel },
  { id: 'supports', label: 'Supports', component: WebsiteSupportsPanel },
  { id: 'programs', label: 'Programs', component: WebsiteProgramsPanel },
  { id: 'footer', label: 'Footer', component: WebsiteFooterPanel },
  { id: 'resources', label: 'Public resources', component: WebsiteResourcesPanel },
  { id: 'inventory', label: 'Content inventory', component: WebsiteContentInventoryPanel },
];

type AdminWebsitePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminWebsitePage({ searchParams }: AdminWebsitePageProps) {
  const { supabase, access } = await buildWebsiteContext();

  const tabParam = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
  const activeTab = TABS.find((tab) => tab.id === tabParam) ?? TABS[0];
  const TabComponent = activeTab.component;

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Website workspace"
        description="Manage branding, navigation, and public content for the marketing site. Changes respect audit logging and Supabase RLS."
      />

      <PageTabNav
        tabs={TABS.map((tab) => ({
          label: tab.label,
          href: `/admin/website?tab=${tab.id}`,
        }))}
        activeHref={`/admin/website?tab=${activeTab.id}`}
      />

      {/* Render only the active tab to avoid duplicate fetches */}
      <div className="space-y-space-lg">
        <TabComponent supabase={supabase} access={access} />
      </div>
    </div>
  );
}
