import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type GuideSection = { id: string; title: string; items: string[] };

const SECTIONS: GuideSection[] = [
  {
    id: 'content',
    title: 'Content & website',
    items: [
      'Publish changes via the Content hub tabs; cache invalidation follows Supabase saves.',
      'Resource and policy updates must keep audit log context; avoid storing PII in marketing content.',
      'Use Website settings for branding/navigation; resource library remains the single source for public resources.',
    ],
  },
  {
    id: 'website',
    title: 'Website settings',
    items: [
      'Tabs mirror the marketing layout: Branding, Navigation, Home, Supports, Programs, Footer, Content inventory.',
      'All changes respect Supabase RLS; keep drafts unpublished until reviewed.',
      'Revalidate marketing cache after significant updates using the built-in actions.',
    ],
  },
  {
    id: 'people',
    title: 'People & access',
    items: [
      'Use the People hub tabs to manage users, profiles, and organizations with least privilege.',
      'Consent overrides require documented rationale; log notes in the record when possible.',
      'Invites and role changes must leave an audit trail; avoid bulk edits outside approved workflows.',
    ],
  },
];

export default async function AdminHelpPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/help');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Admin help"
        description="Quick guidance for hubs and publishing."
        meta={[{ label: 'RLS enforced', tone: 'info' }]}
      />

      <div className="grid gap-space-md lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section.id} id={section.id} className="h-full">
            <CardHeader>
              <CardTitle className="text-title-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-space-2xs text-body-sm text-on-surface-variant" aria-label={`${section.title} guidance`}>
                {section.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
