import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { adminOverrideConsentAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ConsentOverrideForm } from '@/components/admin/consents/consent-override-form';

type ConsentRow = {
  id: number;
  first_name: string;
  last_name: string;
  data_sharing_consent: boolean;
  preferred_contact_method: string | null;
  privacy_restrictions: string | null;
};

export const dynamic = 'force-dynamic';

export default async function AdminConsentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/admin/consents');
  if (!access.canManageConsents) redirect(resolveLandingPath(access));

  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 30,
    p_person_types: null,
    p_status: null,
  });

  if (error) throw error;

  const people = (data ?? []) as ConsentRow[];

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Consents</p>
        <h1 className="text-xl text-foreground sm:text-2xl">Consent overrides</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Adjust sharing and contact preferences when requested by the client. Every change is audited.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {people.map((person: ConsentRow) => (
          <Card key={person.id} className="h-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">{person.first_name ?? 'Person'} {person.last_name ?? ''}</CardTitle>
              <CardDescription>Person ID: {person.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConsentOverrideForm
                personId={person.id}
                dataSharingConsent={person.data_sharing_consent}
                preferredContactMethod={person.preferred_contact_method}
                privacyRestrictions={person.privacy_restrictions}
                action={adminOverrideConsentAction}
              />
            </CardContent>
          </Card>
        ))}
        {people.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No people visible</CardTitle>
              <CardDescription>RLS may be limiting your view or there are no clients yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
