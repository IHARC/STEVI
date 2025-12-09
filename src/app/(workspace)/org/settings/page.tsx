import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import type { Database } from '@/types/supabase';
import { OrgContactSettingsForm, OrgNotesSettingsForm } from './org-settings-form';
import { OrgTabs } from '../org-tabs';

export const dynamic = 'force-dynamic';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'status'
  | 'organization_type'
  | 'partnership_type'
  | 'contact_person'
  | 'contact_title'
  | 'contact_email'
  | 'contact_phone'
  | 'website'
  | 'referral_process'
  | 'special_requirements'
  | 'availability_notes'
>;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'outline',
  under_review: 'outline',
  inactive: 'secondary',
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function OrgSettingsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(resolveLandingPath(access));
  }

  const resolved = searchParams ? await searchParams : undefined;
  const orgParam = resolved?.orgId ?? resolved?.org ?? resolved?.organizationId;
  const parsedOrg = Array.isArray(orgParam) ? Number.parseInt(orgParam[0] ?? '', 10) : Number.parseInt(orgParam ?? '', 10);
  const requestedOrgId = Number.isFinite(parsedOrg) ? parsedOrg : null;
  const targetOrgId = access.organizationId ?? requestedOrgId ?? null;

  if (!targetOrgId && access.canAccessAdminWorkspace) {
    redirect('/org');
  }

  const allowed = (access.canAccessOrgWorkspace && access.organizationId === targetOrgId) || access.canAccessAdminWorkspace;
  if (!allowed || !targetOrgId) {
    redirect(resolveLandingPath(access));
  }

  const { data: organizationRow, error } = await supabase
    .schema('core')
    .from('organizations')
    .select(
      'id, name, status, organization_type, partnership_type, contact_person, contact_title, contact_email, contact_phone, website, referral_process, special_requirements, availability_notes',
    )
    .eq('id', targetOrgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const organization = (organizationRow ?? null) as OrganizationRow | null;

  if (!organization) {
    throw new Error('Organization not found.');
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-3xl sm:text-4xl">Settings</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Update contact details and coordination notes. Changes stay scoped to your organization and are audited.
        </p>
      </header>

      <OrgTabs orgId={targetOrgId} />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Organization snapshot</CardTitle>
            <CardDescription>Reference status and type for your records.</CardDescription>
          </div>
          {organization.status ? (
            <Badge variant={STATUS_VARIANT[organization.status] ?? 'outline'} className="capitalize">
              {organization.status.replaceAll('_', ' ')}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm text-foreground sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Organization name</dt>
              <dd className="font-medium">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="capitalize text-muted-foreground">
                {organization.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Partnership</dt>
              <dd className="capitalize text-muted-foreground">
                {organization.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <OrgContactSettingsForm
          organizationId={targetOrgId}
          initialValues={{
            contact_person: organization.contact_person ?? '',
            contact_title: organization.contact_title ?? '',
            contact_email: organization.contact_email ?? '',
            contact_phone: organization.contact_phone ?? '',
            website: organization.website ?? '',
          }}
        />

        <OrgNotesSettingsForm
          organizationId={targetOrgId}
          initialValues={{
            referral_process: organization.referral_process ?? '',
            special_requirements: organization.special_requirements ?? '',
            availability_notes: organization.availability_notes ?? '',
          }}
        />
      </div>
    </div>
  );
}
