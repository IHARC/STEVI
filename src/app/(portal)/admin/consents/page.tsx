import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { adminOverrideConsentAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

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
  if (!access.canManageConsents) redirect(resolveDefaultWorkspacePath(access));

  const { data, error } = await supabase.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 30,
    p_person_types: null,
    p_status: null,
  });

  if (error) throw error;

  const people = (data ?? []) as ConsentRow[];

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Consents</p>
        <h1 className="text-headline-md text-on-surface sm:text-headline-lg">Consent overrides</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Adjust sharing and contact preferences when requested by the client. Every change is audited.
        </p>
      </header>

      <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        {people.map((person: ConsentRow) => (
          <Card key={person.id} className="h-full">
            <CardHeader className="space-y-space-2xs">
              <CardTitle className="text-title-md">{person.first_name ?? 'Person'} {person.last_name ?? ''}</CardTitle>
              <CardDescription>Person ID: {person.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-space-sm">
              <form action={adminOverrideConsentAction} className="space-y-space-sm">
                <input type="hidden" name="person_id" value={person.id} />
                <label className="flex items-center gap-space-sm text-body-sm text-on-surface">
                  <input
                    type="checkbox"
                    name="data_sharing"
                    defaultChecked={person.data_sharing_consent}
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
                  <Label htmlFor={`privacy_${person.id}`} className="text-label-sm">Privacy notes</Label>
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
          <Card className="border-dashed border-outline/60">
            <CardHeader>
              <CardTitle className="text-title-md">No people visible</CardTitle>
              <CardDescription>RLS may be limiting your view or there are no clients yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
