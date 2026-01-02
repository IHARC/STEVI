'use client';

import Link from 'next/link';
import type { ObservationPromotion, ObservationSummary, ObservationTaskSummary } from '@/lib/observations/types';
import { ObservationList } from '@/components/workspace/observations/observation-list';
import { formatDate } from '@/lib/formatters/datetime';
import { formatEnumLabel } from '@/lib/formatters/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';

type ObservationLeadsBoardProps = {
  leads: ObservationSummary[];
  promotionsByObservation: Record<string, ObservationPromotion[]>;
  duplicatesByObservation?: Record<string, ObservationSummary[]>;
  overdueTasks: ObservationTaskSummary[];
  canPromote: boolean;
};

export function ObservationLeadsBoard({
  leads,
  promotionsByObservation,
  duplicatesByObservation,
  overdueTasks,
  canPromote,
}: ObservationLeadsBoardProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Active leads</CardTitle>
          <CardDescription>Unidentified or unlinked people who need follow-up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ObservationList
            observations={leads}
            promotionsByObservation={promotionsByObservation}
            duplicatesByObservation={duplicatesByObservation}
            canPromote={canPromote}
            showEncounterLink
          />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Overdue welfare checks</CardTitle>
          <CardDescription>Observation follow-ups that are past due.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue welfare check tasks.</p>
          ) : (
            overdueTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-border/40 bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/ops/clients/${task.personId}?tab=overview`} className="font-semibold text-foreground hover:underline">
                      {task.clientName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{task.title}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Due {task.dueAt ? formatDate(task.dueAt) : '—'}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>
                  <Badge variant="outline">Priority: {formatEnumLabel(task.priority)}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
