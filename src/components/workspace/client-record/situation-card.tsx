'use client';

import { useActionState, useEffect } from 'react';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import { updateSituationAction } from '@/lib/client-record/actions';
import { clientRecordInitialState } from '@/lib/client-record/form-state';
import {
  HEALTH_CONCERN_OPTIONS,
  HOUSING_STATUS_OPTIONS,
  RISK_FACTOR_OPTIONS,
  RISK_LEVEL_OPTIONS,
  URGENCY_OPTIONS,
  formatValueLabel,
} from '@/lib/client-record/constants';
import type { ClientIntakeSummary, ClientPersonSummary } from '@/lib/client-record/types';

const EMPTY_MESSAGE = '—';

type SituationCardProps = {
  person: ClientPersonSummary;
  intake: ClientIntakeSummary | null;
  canEdit?: boolean;
};

export function SituationCard({ person, intake, canEdit = false }: SituationCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateSituationAction, clientRecordInitialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Situation updated', description: state.message ?? 'Situation details saved.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Situation update failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const housingStatus = intake?.housing_status ?? person.housing_status;
  const riskLevel = intake?.risk_level ?? person.risk_level;
  const immediateNeeds = intake?.immediate_needs ?? null;
  const healthConcernsRaw = intake?.health_concerns ?? [];
  const healthConcerns = normalizeEnums(healthConcernsRaw, ['none']);
  const riskFactors = normalizeEnums(intake?.risk_factors ?? [], []);
  const intakeDate = intake?.intake_date ?? intake?.created_at ?? null;
  const hasIntake = Boolean(intake);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Situation & risk</CardTitle>
          <CardDescription>Housing, urgency, and health considerations from the latest intake.</CardDescription>
        </div>
        {canEdit && hasIntake ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Update situation</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Update situation</SheetTitle>
                <SheetDescription>Correct intake details and document new information.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <form action={formAction} className="space-y-3">
                  <input type="hidden" name="person_id" value={person.id} />
                  <input type="hidden" name="intake_id" value={intake?.id ?? ''} />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="situation_housing">Housing status</Label>
                      <NativeSelect id="situation_housing" name="housing_status" defaultValue={housingStatus ?? ''}>
                        <option value="">Not specified</option>
                        {HOUSING_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="situation_risk">Risk level</Label>
                      <NativeSelect id="situation_risk" name="risk_level" defaultValue={riskLevel ?? ''}>
                        <option value="">Not specified</option>
                        {RISK_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="situation_needs">Immediate needs</Label>
                    <NativeSelect id="situation_needs" name="immediate_needs" defaultValue={immediateNeeds ?? ''}>
                      <option value="">Not specified</option>
                      {URGENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Health concerns</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {HEALTH_CONCERN_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="health_concerns"
                            value={option.value}
                            defaultChecked={healthConcernsRaw.includes(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Risk factors</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {RISK_FACTOR_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="risk_factors"
                            value={option.value}
                            defaultChecked={(intake?.risk_factors ?? []).includes(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="situation_notes">Situation notes</Label>
                    <Textarea id="situation_notes" name="situation_notes" rows={2} defaultValue={intake?.situation_notes ?? ''} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="general_notes">General notes</Label>
                    <Textarea id="general_notes" name="general_notes" rows={2} defaultValue={intake?.general_notes ?? ''} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="situation_change_reason">Change reason (optional)</Label>
                    <Textarea id="situation_change_reason" name="change_reason" rows={2} placeholder="Correction, new info" />
                  </div>

                  <Button type="submit" size="sm">Save situation</Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Housing status</dt>
            <dd className="mt-1">
              {housingStatus ? (
                <Badge variant="outline">{formatValueLabel(housingStatus)}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk level</dt>
            <dd className="mt-1">
              {riskLevel ? (
                <Badge variant={riskBadgeVariant(riskLevel)}>{formatValueLabel(riskLevel)}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Immediate needs</dt>
            <dd className="mt-1">
              {immediateNeeds ? (
                <Badge variant={urgencyBadgeVariant(immediateNeeds)}>{formatValueLabel(immediateNeeds)}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Health concerns</p>
          {renderBadgeList(
            healthConcerns,
            healthConcernsRaw.includes('none') ? 'None noted' : 'None recorded',
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Risk factors</p>
          {renderBadgeList(riskFactors, 'None recorded')}
        </div>

        {intake?.situation_notes ? (
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Situation notes</p>
            <p className="text-sm text-foreground/80">{intake.situation_notes}</p>
          </div>
        ) : null}

        {intake?.general_notes ? (
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">General notes</p>
            <p className="text-sm text-foreground/80">{intake.general_notes}</p>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Last intake: {intakeDate ? formatDate(intakeDate) : 'Not recorded'}
        </p>

        {!hasIntake ? (
          <p className="text-xs text-muted-foreground">No intake details on file yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function normalizeEnums(values: string[] | null | undefined, removeValues: string[]) {
  return (values ?? []).filter((value) => value && !removeValues.includes(value));
}

function renderBadgeList(values: string[], emptyLabel: string) {
  if (!values.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {formatValueLabel(value)}
        </Badge>
      ))}
    </div>
  );
}

function riskBadgeVariant(value: string) {
  switch (value) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    default:
      return 'outline';
  }
}

function urgencyBadgeVariant(value: string) {
  switch (value) {
    case 'emergency':
    case 'urgent':
      return 'destructive';
    case 'concern':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value ?? '—';
  }
}
