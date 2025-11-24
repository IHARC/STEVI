import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

type PeopleListItem = {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  person_type: string;
  data_sharing_consent: boolean;
  phone: string | null;
  email: string | null;
};

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/admin/clients');
  if (!access.canManageConsents) redirect(resolveDefaultWorkspacePath(access));

  const { data, error } = await supabase.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 50,
    p_person_types: null,
    p_status: null,
  });

  if (error) {
    throw error;
  }

  const people = (data ?? []) as PeopleListItem[];

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Clients</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Client directory</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          RLS-limited view of people records. Use consent overrides to align sharing with client wishes.
        </p>
      </header>

      <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        {people.map((person: PeopleListItem) => (
          <Card key={person.id} className="h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-space-sm">
              <div className="space-y-space-2xs">
                <CardTitle className="text-title-md">{person.first_name ?? 'Person'} {person.last_name ?? ''}</CardTitle>
                <CardDescription>Person ID: {person.id}</CardDescription>
                <p className="text-body-sm text-muted-foreground">Type: {person.person_type ?? 'unspecified'}</p>
              </div>
              <Badge variant={person.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {person.status ?? 'active'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-space-2xs text-body-sm text-on-surface/80">
              <p>Email: {person.email ?? '—'}</p>
              <p>Phone: {person.phone ?? '—'}</p>
              <p>Data sharing: {person.data_sharing_consent ? 'Yes' : 'No'}</p>
              <Button asChild variant="outline" className="mt-space-sm w-full">
                <Link href={`/admin/clients/${person.id}`}>Open details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {people.length === 0 ? (
          <Card className="border-dashed border-outline/60">
            <CardHeader>
              <CardTitle className="text-title-md">No clients visible</CardTitle>
              <CardDescription>Adjust RLS or check filters if you expect results.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
