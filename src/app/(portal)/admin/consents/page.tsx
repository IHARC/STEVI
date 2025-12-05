import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { adminOverrideConsentAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resolveLandingPath } from '@/lib/portal-navigation';

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
              <form action={adminOverrideConsentAction} className="space-y-3">
                <input type="hidden" name="person_id" value={person.id} />
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="data_sharing"
                    defaultChecked={person.data_sharing_consent}
                    className="h-4 w-4 rounded border-border/60"
                  />
                  <span>Allow data sharing</span>
                </label>

                <div className="space-y-1">
                  <Label className="text-xs">Preferred contact</Label>
                  <select
                    name="preferred_contact"
                    defaultValue={person.preferred_contact_method ?? 'email'}
                    className="w-full rounded-md border border-border/40 bg-background px-3 py-1 text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`privacy_${person.id}`} className="text-xs">Privacy notes</Label>
                  <Textarea
                    id={`privacy_${person.id}`}
                    name="privacy_restrictions"
                    defaultValue={person.privacy_restrictions ?? ''}
                    rows={3}
                    placeholder="Document verbal consent changes or safety constraints."
                  />
                </div>

                <Button type="submit" className="w-full">Save override</Button>
              </form>
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
