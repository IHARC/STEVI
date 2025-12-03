import {
  WebsiteBrandingPanel,
  WebsiteNavigationPanel,
  WebsiteHomePanel,
  WebsiteSupportsPanel,
  WebsiteProgramsPanel,
  WebsiteFooterPanel,
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
  { id: 'inventory', label: 'Content inventory', component: WebsiteContentInventoryPanel },
];

type AdminWebsitePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminWebsitePage({ searchParams }: AdminWebsitePageProps) {
  const { supabase, access } = await buildWebsiteContext();

  const tabParams = await searchParams;
  const tabParam = Array.isArray(tabParams?.tab) ? tabParams.tab[0] : tabParams?.tab;
  const activeTab = TABS.find((tab) => tab.id === tabParam) ?? TABS[0];
  const TabComponent = activeTab.component;

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Website settings"
        description="Manage branding, navigation, and public content for the marketing site. Changes respect audit logging and Supabase RLS."
        meta={[
          { label: 'RLS enforced', tone: 'info' },
          { label: 'Audit on', tone: 'success' },
        ]}
        helperLink={{ href: '/admin/help#website', label: 'View publishing guide' }}
      />

      <PageTabNav
        tabs={TABS.map((tab) => ({
          label: tab.label,
          href: `/admin/website?tab=${tab.id}`,
        }))}
        activeHref={`/admin/website?tab=${activeTab.id}`}
      />

      <div className="text-body-sm text-muted-foreground">
        <span className="font-medium text-on-surface">What’s inside:</span>
        <ul className="mt-space-2xs flex flex-wrap gap-space-xs" role="list">
          {TABS.map((tab) => (
            <li key={tab.id} className="rounded-[var(--md-sys-shape-corner-small)] bg-surface-container-low px-space-sm py-space-3xs text-label-sm text-on-surface-variant">
              {tab.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Render only the active tab to avoid duplicate fetches */}
      <div className="space-y-space-lg">
        <Suspense fallback={<WebsitePanelSkeleton />}>
          <TabComponent supabase={supabase} access={access} />
        </Suspense>
      </div>
    </div>
  );
}

function WebsitePanelSkeleton() {
  return (
    <div className="space-y-space-sm">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <Skeleton className="h-64 w-full rounded-[var(--md-sys-shape-corner-large)]" />
    </div>
  );
}
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
