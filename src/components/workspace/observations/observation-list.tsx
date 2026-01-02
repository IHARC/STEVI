"use client";

import { formatDate, formatDateTime } from '@/lib/formatters/datetime';
import { formatEnumLabel } from '@/lib/formatters/text';
import type { ObservationCategory, ObservationPromotion, ObservationSummary } from '@/lib/observations/types';
import { OBSERVATION_LEAD_STATUSES } from '@/lib/observations/constants';
import {
  promoteObservationToIncidentAction,
  promoteObservationToMedicalAction,
  promoteObservationToReferralAction,
  resolveObservationSubjectAction,
  updateObservationLeadStatusAction,
} from '@/lib/observations/actions';
import { INCIDENT_TYPE_OPTIONS, type IncidentType } from '@/lib/cfs/constants';
import Link from 'next/link';
import { Card, CardContent } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { CfsPersonSearch } from '@/components/workspace/cfs/cfs-person-search';

const DEFAULT_INCIDENT_TYPE_BY_CATEGORY: Partial<Record<ObservationCategory, IncidentType>> = {
  health_concern: 'medical',
  safety_concern: 'disturbance',
  welfare_check: 'welfare_check',
  housing_basic_needs: 'outreach',
  relationship_social: 'outreach',
  other: 'other',
};

type ObservationListProps = {
  observations: ObservationSummary[];
  promotionsByObservation?: Record<string, ObservationPromotion[]>;
  duplicatesByObservation?: Record<string, ObservationSummary[]>;
  encounterPersonName?: string;
  canPromote?: boolean;
  showEncounterLink?: boolean;
};

export function ObservationList({
  observations,
  promotionsByObservation = {},
  duplicatesByObservation,
  encounterPersonName,
  canPromote = false,
  showEncounterLink = false,
}: ObservationListProps) {
  if (observations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No observations yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {observations.map((observation) => {
        const promotions = promotionsByObservation[observation.id] ?? [];
        const promotionTypes = new Set(promotions.map((item) => item.promotionType));
        const duplicateEntries = duplicatesByObservation?.[observation.id] ?? [];
        const subjectLabel = formatSubjectLabel(observation, encounterPersonName);
        const incidentTypeHint = DEFAULT_INCIDENT_TYPE_BY_CATEGORY[observation.category] ?? 'other';

        return (
          <Card key={observation.id} className="border-border/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{observation.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEnumLabel(observation.category)} · {subjectLabel}
                  </p>
                  {observation.details ? (
                    <p className="text-xs text-foreground/80">{observation.details}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatDateTime(observation.recordedAt)}</p>
                  {showEncounterLink && observation.encounterId ? (
                    <Link className="text-primary hover:underline" href={`/ops/encounters/${observation.encounterId}`}>
                      View encounter
                    </Link>
                  ) : null}
                </div>
              </div>

              {(observation.lastSeenAt || observation.lastSeenLocation) ? (
                <div className="text-xs text-muted-foreground">
                  {observation.lastSeenAt ? `Last seen ${formatDateTime(observation.lastSeenAt)}` : null}
                  {observation.lastSeenAt && observation.lastSeenLocation ? ' • ' : null}
                  {observation.lastSeenLocation ? `Location: ${observation.lastSeenLocation}` : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{formatEnumLabel(observation.source)}</Badge>
                <Badge variant="outline">{formatEnumLabel(observation.verificationStatus)}</Badge>
                {observation.leadStatus ? (
                  <Badge variant="secondary">Lead: {formatEnumLabel(observation.leadStatus)}</Badge>
                ) : null}
                {observation.leadExpiresAt ? (
                  <Badge variant="outline">Expires {formatDate(observation.leadExpiresAt)}</Badge>
                ) : null}
                {observation.sensitivityLevel !== 'standard' ? (
                  <Badge variant="destructive">{formatEnumLabel(observation.sensitivityLevel)}</Badge>
                ) : null}
                <Badge variant={observation.visibilityScope === 'shared_via_consent' ? 'secondary' : 'outline'}>
                  {observation.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}
                </Badge>
                {promotions.map((promotion) => (
                  <Badge key={promotion.id} variant="outline">
                    Promoted: {formatEnumLabel(promotion.promotionType)}
                  </Badge>
                ))}
                {duplicateEntries.length > 0 ? (
                  <Badge variant="outline">Possible duplicate</Badge>
                ) : null}
              </div>

              {duplicateEntries.length > 0 ? (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-xs text-muted-foreground">
                  Possible matches:{' '}
                  {duplicateEntries.map((entry) => entry.summary).join(' • ')}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {observation.leadStatus ? (
                  <form action={updateObservationLeadStatusAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="observation_id" value={observation.id} />
                    {observation.encounterId ? (
                      <input type="hidden" name="encounter_id" value={observation.encounterId} />
                    ) : null}
                    <NativeSelect name="lead_status" defaultValue={observation.leadStatus}>
                      {OBSERVATION_LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{formatEnumLabel(status)}</option>
                      ))}
                    </NativeSelect>
                    <Button type="submit" size="sm" variant="outline">Update status</Button>
                  </form>
                ) : null}

                {(observation.subjectType === 'named_unlinked' || observation.subjectType === 'unidentified') ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button type="button" size="sm" variant="outline">Resolve to person</Button>
                    </SheetTrigger>
                    <SheetContent className="w-full max-w-lg overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Resolve lead</SheetTitle>
                        <SheetDescription>Link this lead to a known person record.</SheetDescription>
                      </SheetHeader>
                      <form action={resolveObservationSubjectAction} className="mt-4 space-y-3">
                        <input type="hidden" name="observation_id" value={observation.id} />
                        <CfsPersonSearch name="subject_person_id" label="Person" placeholder="Search by name" required />
                        <Button type="submit">Resolve lead</Button>
                      </form>
                    </SheetContent>
                  </Sheet>
                ) : null}

                {canPromote ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button type="button" size="sm">Promote</Button>
                    </SheetTrigger>
                    <SheetContent className="w-full max-w-2xl overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Promote observation</SheetTitle>
                        <SheetDescription>Turn this observation into a durable record.</SheetDescription>
                      </SheetHeader>

                      <div className="mt-4 space-y-6">
                        <section className="space-y-3 rounded-lg border border-border/50 p-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Medical episode</h3>
                            <p className="text-xs text-muted-foreground">Create a medical episode for this person.</p>
                            {!observation.personId ? (
                              <p className="text-xs text-muted-foreground">Requires a known person.</p>
                            ) : null}
                          </div>
                          <form action={promoteObservationToMedicalAction} className="space-y-3">
                            <input type="hidden" name="observation_id" value={observation.id} />
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`episode_type_${observation.id}`}>Episode type</Label>
                                <Input id={`episode_type_${observation.id}`} name="episode_type" placeholder="Overdose, wound care" required />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`primary_condition_${observation.id}`}>Primary condition</Label>
                                <Input id={`primary_condition_${observation.id}`} name="primary_condition" placeholder="Primary condition" required />
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`episode_date_${observation.id}`}>Episode date</Label>
                                <Input id={`episode_date_${observation.id}`} name="episode_date" type="date" required />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`location_occurred_${observation.id}`}>Location occurred</Label>
                                <Input id={`location_occurred_${observation.id}`} name="location_occurred" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`assessment_summary_${observation.id}`}>Assessment summary</Label>
                              <Textarea id={`assessment_summary_${observation.id}`} name="assessment_summary" rows={2} defaultValue={observation.details ?? ''} />
                            </div>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!observation.personId || promotionTypes.has('medical_episode')}
                            >
                              {promotionTypes.has('medical_episode') ? 'Already promoted' : 'Promote to medical'}
                            </Button>
                          </form>
                        </section>

                        <section className="space-y-3 rounded-lg border border-border/50 p-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Incident</h3>
                            <p className="text-xs text-muted-foreground">Create an incident record for field response tracking.</p>
                          </div>
                          <form action={promoteObservationToIncidentAction} className="space-y-3">
                            <input type="hidden" name="observation_id" value={observation.id} />
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`incident_type_${observation.id}`}>Incident type</Label>
                                <NativeSelect id={`incident_type_${observation.id}`} name="incident_type" defaultValue={incidentTypeHint}>
                                  {INCIDENT_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{formatEnumLabel(option)}</option>
                                  ))}
                                </NativeSelect>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`incident_location_${observation.id}`}>Location</Label>
                                <Input id={`incident_location_${observation.id}`} name="incident_location" defaultValue={observation.lastSeenLocation ?? ''} required />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`incident_description_${observation.id}`}>Description</Label>
                              <Textarea
                                id={`incident_description_${observation.id}`}
                                name="incident_description"
                                rows={2}
                                defaultValue={observation.details ?? observation.summary}
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={promotionTypes.has('safety_incident')}>
                              {promotionTypes.has('safety_incident') ? 'Already promoted' : 'Promote to incident'}
                            </Button>
                          </form>
                        </section>

                        <section className="space-y-3 rounded-lg border border-border/50 p-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Referral</h3>
                            <p className="text-xs text-muted-foreground">Send the client to another program or partner.</p>
                            {!observation.personId ? (
                              <p className="text-xs text-muted-foreground">Requires a known person.</p>
                            ) : null}
                          </div>
                          <form action={promoteObservationToReferralAction} className="space-y-3">
                            <input type="hidden" name="observation_id" value={observation.id} />
                            <div className="space-y-1">
                              <Label htmlFor={`referred_to_${observation.id}`}>Referred to</Label>
                              <Input id={`referred_to_${observation.id}`} name="referred_to_name" placeholder="Organization or program" required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`referral_summary_${observation.id}`}>Summary</Label>
                              <Input id={`referral_summary_${observation.id}`} name="referral_summary" defaultValue={observation.summary} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`referral_details_${observation.id}`}>Details</Label>
                              <Textarea id={`referral_details_${observation.id}`} name="referral_details" rows={2} defaultValue={observation.details ?? ''} />
                            </div>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!observation.personId || promotionTypes.has('referral')}
                            >
                              {promotionTypes.has('referral') ? 'Already promoted' : 'Promote to referral'}
                            </Button>
                          </form>
                        </section>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatSubjectLabel(observation: ObservationSummary, encounterPersonName?: string) {
  switch (observation.subjectType) {
    case 'this_client':
      return encounterPersonName ? `This client · ${encounterPersonName}` : 'This client';
    case 'known_person':
      return observation.subjectName ?? (observation.subjectPersonId ? `Person ${observation.subjectPersonId}` : 'Known person');
    case 'named_unlinked':
      return observation.subjectName ?? 'Named person';
    case 'unidentified':
      return observation.subjectDescription ?? 'Unidentified person';
    default:
      return 'Observation';
  }
}
