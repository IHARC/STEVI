import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import type { Database } from '@/types/supabase';
import { OrgContactSettingsForm, OrgNotesSettingsForm } from './org-settings-form';

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

export default async function OrgSettingsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace || !access.organizationId) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const { data: organizationRow, error } = await supabase
    .schema('core')
    .from('organizations')
    .select(
      'id, name, status, organization_type, partnership_type, contact_person, contact_title, contact_email, contact_phone, website, referral_process, special_requirements, availability_notes',
    )
    .eq('id', access.organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const organization = (organizationRow ?? null) as OrganizationRow | null;

  if (!organization) {
    throw new Error('Organization not found.');
  }

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-headline-lg sm:text-display-sm">Settings</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Update contact details and coordination notes. Changes stay scoped to your organization and are audited.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-space-sm">
          <div>
            <CardTitle className="text-title-md">Organization snapshot</CardTitle>
            <CardDescription>Reference status and type for your records.</CardDescription>
          </div>
          {organization.status ? (
            <Badge variant={STATUS_VARIANT[organization.status] ?? 'outline'} className="capitalize">
              {organization.status.replaceAll('_', ' ')}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-space-sm text-body-sm text-on-surface sm:grid-cols-3">
            <div>
              <dt className="text-label-sm text-muted-foreground">Organization name</dt>
              <dd className="font-medium">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-label-sm text-muted-foreground">Type</dt>
              <dd className="capitalize text-muted-foreground">
                {organization.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-label-sm text-muted-foreground">Partnership</dt>
              <dd className="capitalize text-muted-foreground">
                {organization.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-space-md lg:grid-cols-2">
        <OrgContactSettingsForm
          initialValues={{
            contact_person: organization.contact_person,
            contact_title: organization.contact_title,
            contact_email: organization.contact_email,
            contact_phone: organization.contact_phone,
            website: organization.website,
          }}
        />

        <OrgNotesSettingsForm
          initialValues={{
            referral_process: organization.referral_process,
            special_requirements: organization.special_requirements,
            availability_notes: organization.availability_notes,
          }}
        />
      </div>
    </div>
  );
}
