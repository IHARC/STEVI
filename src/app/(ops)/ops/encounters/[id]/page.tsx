import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchEncounterById } from '@/lib/encounters/queries';
import { closeEncounterAction } from '@/lib/encounters/actions';
import { fetchTasksForEncounter } from '@/lib/tasks/queries';
import { updateTaskStatusAction } from '@/lib/tasks/actions';
import { fetchInventoryItems, fetchInventoryLocations } from '@/lib/inventory/service';
import { fetchMedicalEpisodesForPerson } from '@/lib/medical/queries';
import { fetchJusticeEpisodesForPerson } from '@/lib/justice/queries';
import { fetchRelationshipsForPerson } from '@/lib/relationships/queries';
import { fetchCharacteristicsForPerson } from '@/lib/characteristics/queries';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { EncounterTaskForm } from '@workspace/encounters/encounter-task-form';
import { EncounterSuppliesForm } from '@workspace/encounters/encounter-supplies-form';
import { MedicalEpisodesCard } from '@workspace/client-record/medical-episodes-card';
import { JusticeEpisodesCard } from '@workspace/client-record/justice-episodes-card';
import { RelationshipsCard } from '@workspace/client-record/relationships-card';
import { CharacteristicsCard } from '@workspace/client-record/characteristics-card';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

type PersonRow = Pick<Database['core']['Tables']['people']['Row'], 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>;


export default async function EncounterDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=${encodeURIComponent(`/ops/encounters/${id}`)}`);
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const encounter = await fetchEncounterById(supabase, id);
  if (!encounter) notFound();

  const [person, tasks, items, locations, medicalEpisodes, justiceEpisodes, relationships, characteristics] = await Promise.all([
    loadPerson(supabase, encounter.personId),
    fetchTasksForEncounter(supabase, encounter.id, 50),
    access.canAccessInventoryOps ? fetchInventoryItems(supabase) : Promise.resolve([]),
    access.canAccessInventoryOps ? fetchInventoryLocations(supabase) : Promise.resolve([]),
    fetchMedicalEpisodesForPerson(supabase, encounter.personId, 6),
    fetchJusticeEpisodesForPerson(supabase, encounter.personId, 6),
    fetchRelationshipsForPerson(supabase, encounter.personId, 6),
    fetchCharacteristicsForPerson(supabase, encounter.personId, 6),
  ]);

  if (!person) notFound();

  const encounterMeta = [
    { label: `Type: ${encounter.encounterType.replaceAll('_', ' ')}`, tone: 'neutral' as const },
    { label: encounter.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal', tone: 'info' as const },
  ];
  const encounterId = encounter.id;

  const closeAction = async () => {
    'use server';
    await closeEncounterAction(encounter.id);
    revalidatePath(`/ops/encounters/${encounter.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Encounter"
        title={encounter.summary ?? `Encounter for ${person.first_name ?? 'Person'} ${person.last_name ?? ''}`.trim()}
        description="Use this workspace to log tasks, supplies, and care updates tied to this encounter."
        actions={
          encounter.endedAt ? null : (
            <form action={closeAction}>
              <Button type="submit" variant="outline">Close encounter</Button>
            </form>
          )
        }
        secondaryAction={{ label: 'Back to client profile', href: `/ops/clients/${person.id}?tab=overview` }}
        breadcrumbs={[{ label: 'Clients', href: '/ops/clients?view=directory' }, { label: 'Encounter' }]}
        meta={encounterMeta}
      />

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Encounter details</CardTitle>
              <CardDescription>Context captured at the start of the encounter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Person</p>
                  <p className="font-medium">{person.first_name ?? 'Person'} {person.last_name ?? ''}</p>
                  <p className="text-xs text-muted-foreground">{person.email ?? 'No email'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Started</p>
                  <p>{formatDateTime(encounter.startedAt)}</p>
                  {encounter.endedAt ? <p className="text-xs text-muted-foreground">Ended {formatDateTime(encounter.endedAt)}</p> : null}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Location</p>
                  <p>{encounter.locationContext ?? 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Program</p>
                  <p>{encounter.programContext ?? 'Not specified'}</p>
                </div>
              </div>
              {encounter.notes ? (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Notes</p>
                  <p>{encounter.notes}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{encounter.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}</Badge>
                {encounter.sensitivityLevel !== 'standard' ? (
                  <Badge variant="destructive">{encounter.sensitivityLevel}</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Encounter tasks</CardTitle>
              <CardDescription>Tasks created for this encounter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks yet. Add one to track next steps.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-border/40 bg-card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{task.title}</p>
                        {task.description ? <p className="text-xs text-muted-foreground">{task.description}</p> : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="capitalize">{task.status.replaceAll('_', ' ')}</p>
                        {task.dueAt ? <p>Due {new Date(task.dueAt).toLocaleDateString()}</p> : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">Priority: {task.priority}</Badge>
                      <form action={updateTask.bind(null, task.id, 'in_progress')}>
                        <Button type="submit" size="sm" variant="outline" disabled={task.status !== 'open'}>
                          Start
                        </Button>
                      </form>
                      <form action={updateTask.bind(null, task.id, 'done')}>
                        <Button type="submit" size="sm" variant="secondary" disabled={task.status === 'done'}>
                          Mark done
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <MedicalEpisodesCard personId={person.id} caseId={encounter.caseId} encounterId={encounter.id} episodes={medicalEpisodes} />
          <JusticeEpisodesCard personId={person.id} caseId={encounter.caseId} encounterId={encounter.id} episodes={justiceEpisodes} />
        </div>

        <div className="space-y-4">
          <EncounterTaskForm personId={person.id} caseId={encounter.caseId} encounterId={encounter.id} />
          <EncounterSuppliesForm
            personId={person.id}
            encounterId={encounter.id}
            locations={locations}
            items={items}
            disabled={!access.canAccessInventoryOps}
          />
          <RelationshipsCard personId={person.id} caseId={encounter.caseId} encounterId={encounter.id} relationships={relationships} />
          <CharacteristicsCard personId={person.id} caseId={encounter.caseId} encounterId={encounter.id} characteristics={characteristics} />
        </div>
      </section>
    </div>
  );

  async function updateTask(taskId: string, status: 'open' | 'in_progress' | 'blocked' | 'done' | 'canceled') {
    'use server';
    await updateTaskStatusAction(taskId, status);
    revalidatePath(`/ops/encounters/${encounterId}`);
  }
}

async function loadPerson(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select('id, first_name, last_name, email, phone')
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
