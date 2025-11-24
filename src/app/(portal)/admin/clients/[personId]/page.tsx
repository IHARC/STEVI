import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  adminCreateGrantAction,
  adminOverrideConsentAction,
  adminRevokeGrantAction,
} from '@/lib/cases/actions';
import { fetchPersonGrants, GRANT_SCOPES, type PersonGrant } from '@/lib/cases/grants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import type { Database } from '@/types/supabase';

type PersonRow = Pick<
  Database['core']['Tables']['people']['Row'],
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'data_sharing_consent'
  | 'preferred_contact_method'
  | 'privacy_restrictions'
  | 'created_at'
  | 'created_by'
>;

type OrganizationOption = {
  id: number;
  name: string;
};

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ personId: string }> };

export default async function AdminPersonDetailPage({ params }: PageProps) {
  const { personId } = await params;
  const id = Number.parseInt(personId, 10);
  if (!id || Number.isNaN(id)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  if (!access) redirect('/login?next=/admin/clients');
  if (!access.canManageConsents) redirect(resolveDefaultWorkspacePath(access));

  const person = await loadPerson(supabase, id);
  if (!person) notFound();

  const [grants, organizations] = await Promise.all([
    fetchPersonGrants(supabase, id),
    loadOrganizations(supabase),
  ]);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Client access</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">
          {person.first_name ?? 'Person'} {person.last_name ?? ''}
        </h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Manage consents and granular access grants. All actions are audited.
        </p>
      </header>

      <div className="grid gap-space-lg lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Consent overrides</CardTitle>
            <CardDescription>Adjust sharing and contact preferences with client approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsentForm person={person} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Access grants</CardTitle>
            <CardDescription>Grant orgs or users scoped access; revoke when no longer needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-md">
            <GrantForm personId={person.id} organizations={organizations} />
            <GrantList grants={grants} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function loadPerson(supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>, id: number) {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select(
      'id, first_name, last_name, email, phone, data_sharing_consent, preferred_contact_method, privacy_restrictions, created_at, created_by',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PersonRow | null;
}

async function loadOrganizations(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
): Promise<OrganizationOption[]> {
  const { data, error } = await supabase.schema('core').from('organizations').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []).map((org: { id: number; name: string }) => ({ id: org.id, name: org.name }));
}

function ConsentForm({ person }: { person: PersonRow }) {
  return (
    <form action={adminOverrideConsentAction} className="space-y-space-sm">
      <input type="hidden" name="person_id" value={person.id} />
      <label className="flex items-center gap-space-sm text-body-sm text-on-surface">
        <input
          type="checkbox"
          name="data_sharing"
          defaultChecked={Boolean(person.data_sharing_consent ?? false)}
          className="h-4 w-4 rounded border-outline/60"
        />
        <span>Allow data sharing</span>
      </label>

      <div className="space-y-space-2xs">
        <Label className="text-label-sm">Preferred contact</Label>
        <select
          name="preferred_contact"
          defaultValue={person.preferred_contact_method ?? 'email'}
          className="w-full rounded-md border border-outline/40 bg-surface px-space-sm py-space-2xs text-body-sm"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="both">Both</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="space-y-space-2xs">
        <Label htmlFor="privacy_notes" className="text-label-sm">Privacy notes</Label>
        <Textarea
          id="privacy_notes"
          name="privacy_restrictions"
          defaultValue={person.privacy_restrictions ?? ''}
          rows={3}
          placeholder="Document verbal consent changes or safety constraints."
        />
      </div>

      <Button type="submit" className="w-full">Save override</Button>
    </form>
  );
}

function GrantForm({ personId, organizations }: { personId: number; organizations: OrganizationOption[] }) {
  return (
    <form action={adminCreateGrantAction} className="space-y-space-sm">
      <input type="hidden" name="person_id" value={personId} />
      <div className="space-y-space-2xs">
        <Label className="text-label-sm" htmlFor="scope">Scope</Label>
        <select
          id="scope"
          name="scope"
          className="w-full rounded-md border border-outline/40 bg-surface px-space-sm py-space-2xs text-body-sm"
          defaultValue="view"
        >
          {GRANT_SCOPES.map((scope) => (
            <option key={scope} value={scope}>{scope}</option>
          ))}
        </select>
      </div>
      <div className="space-y-space-2xs">
        <Label className="text-label-sm">User ID (optional)</Label>
        <input
          name="grantee_user_id"
          className="w-full rounded-md border border-outline/40 bg-surface px-space-sm py-space-2xs text-body-sm"
          placeholder="UUID of user"
        />
      </div>
      <div className="space-y-space-2xs">
        <Label className="text-label-sm">Organization (optional)</Label>
        <select
          name="grantee_org_id"
          className="w-full rounded-md border border-outline/40 bg-surface px-space-sm py-space-2xs text-body-sm"
          defaultValue=""
        >
          <option value="">—</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full">Grant access</Button>
    </form>
  );
}

function GrantList({ grants }: { grants: PersonGrant[] }) {
  if (grants.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No active grants.</p>;
  }

  return (
    <div className="space-y-space-xs">
      <p className="text-label-sm text-muted-foreground">Active grants</p>
      <ul className="space-y-space-2xs">
        {grants.map((grant) => (
          <li key={grant.id} className="flex flex-wrap items-center justify-between gap-space-xs rounded-md border border-outline/30 bg-surface-container p-space-sm text-body-sm">
            <div className="space-y-space-3xs">
              <p className="font-medium text-on-surface">{grant.scope}</p>
              <p className="text-muted-foreground">
                {grant.granteeUserId ? `User ${grant.granteeUserId}` : grant.orgName ? grant.orgName : `Org ${grant.granteeOrgId}`}
              </p>
            </div>
            <form action={adminRevokeGrantAction}>
              <input type="hidden" name="grant_id" value={grant.id} />
              <Button variant="ghost" size="sm">Revoke</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
