'use client';

import { useEffect, useActionState } from 'react';

import type { JusticeEpisodeSummary } from '@/lib/justice/types';
import {
  createJusticeEpisodeAction,
  updateJusticeEpisodeAction,
  type JusticeEpisodeFormState,
  type JusticeEpisodeUpdateState,
} from '@/lib/justice/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';

const initialState: JusticeEpisodeFormState = { status: 'idle' };
const updateInitialState: JusticeEpisodeUpdateState = { status: 'idle' };

const EPISODE_TYPES = [
  { value: 'arrest', label: 'Arrest' },
  { value: 'charge', label: 'Charge' },
  { value: 'court', label: 'Court' },
  { value: 'probation', label: 'Probation' },
  { value: 'parole', label: 'Parole' },
  { value: 'warrant', label: 'Warrant' },
  { value: 'other', label: 'Other' },
];

const SOURCE_OPTIONS = [
  { value: 'staff_observed', label: 'Staff observed' },
  { value: 'client_reported', label: 'Client reported' },
  { value: 'document', label: 'Document' },
  { value: 'partner_org', label: 'Partner org' },
  { value: 'system', label: 'System' },
];

const VERIFICATION_OPTIONS = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'verified', label: 'Verified' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'stale', label: 'Stale' },
];

const VISIBILITY_OPTIONS = [
  { value: 'internal_to_org', label: 'Internal only' },
  { value: 'shared_via_consent', label: 'Share via consent' },
];

const SENSITIVITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'high', label: 'High' },
  { value: 'restricted', label: 'Restricted' },
];

type JusticeEpisodesCardProps = {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  episodes: JusticeEpisodeSummary[];
  formVariant?: 'inline' | 'sheet';
  canEdit?: boolean;
};

export function JusticeEpisodesCard({
  personId,
  caseId,
  encounterId,
  episodes,
  formVariant = 'inline',
  canEdit = false,
}: JusticeEpisodesCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createJusticeEpisodeAction, initialState);
  const [updateState, updateAction] = useActionState(updateJusticeEpisodeAction, updateInitialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Justice update saved', description: state.message ?? 'Justice record updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Justice update failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  useEffect(() => {
    if (updateState.status === 'success') {
      toast({ title: 'Justice update revised', description: updateState.message ?? 'Justice record updated.' });
    }
    if (updateState.status === 'error') {
      toast({ title: 'Justice update failed', description: updateState.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [updateState, toast]);

  const form = (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
      {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_episode_type">Episode type</Label>
          <NativeSelect id="justice_episode_type" name="episode_type" defaultValue="other">
            {EPISODE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_event_date">Event date</Label>
          <Input id="justice_event_date" name="event_date" type="date" required />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_event_time">Event time</Label>
          <Input id="justice_event_time" name="event_time" type="time" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_agency">Agency</Label>
          <Input id="justice_agency" name="agency" placeholder="OPP, RCMP" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="justice_charges">Charges</Label>
        <Input id="justice_charges" name="charges" placeholder="Charge details" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_case_number">Case number</Label>
          <Input id="justice_case_number" name="case_number" placeholder="Case number" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_bail_amount">Bail amount</Label>
          <Input id="justice_bail_amount" name="bail_amount" type="number" min="0" step="0.01" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_booking_number">Booking number</Label>
          <Input id="justice_booking_number" name="booking_number" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_disposition">Disposition</Label>
          <Input id="justice_disposition" name="disposition" placeholder="Disposition outcome" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_location">Location</Label>
          <Input id="justice_location" name="location" placeholder="Location" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_release_type">Release type</Label>
          <Input id="justice_release_type" name="release_type" placeholder="Release type" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_court_date">Court date</Label>
          <Input id="justice_court_date" name="court_date" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_check_in_date">Check-in date</Label>
          <Input id="justice_check_in_date" name="check_in_date" type="date" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_release_date">Release date</Label>
          <Input id="justice_release_date" name="release_date" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_supervision_agency">Supervision agency</Label>
          <Input id="justice_supervision_agency" name="supervision_agency" placeholder="Supervision agency" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="justice_notes">Notes</Label>
        <Textarea id="justice_notes" name="notes" rows={3} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_source">Source</Label>
          <NativeSelect id="justice_source" name="source" defaultValue="staff_observed">
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_verification">Verification</Label>
          <NativeSelect id="justice_verification" name="verification_status" defaultValue="unverified">
            {VERIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_visibility">Visibility</Label>
          <NativeSelect id="justice_visibility" name="visibility_scope" defaultValue="internal_to_org">
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_sensitivity">Sensitivity</Label>
          <NativeSelect id="justice_sensitivity" name="sensitivity_level" defaultValue="standard">
            {SENSITIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <Button type="submit" size="sm">Save justice update</Button>
    </form>
  );

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Justice history</CardTitle>
          <CardDescription>Track court dates, supervision, and outcomes.</CardDescription>
        </div>
        {formVariant === 'sheet' ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Add justice update</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Add justice update</SheetTitle>
                <SheetDescription>Capture court, supervision, and case outcomes.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{form}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No justice updates recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{episode.charges ?? 'Justice episode'}</p>
                    <p className="text-xs text-muted-foreground">{episode.episodeType}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(episode.eventDate).toLocaleDateString()}</span>
                    {canEdit ? (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto sm:max-w-xl">
                          <SheetHeader className="text-left">
                            <SheetTitle>Edit justice update</SheetTitle>
                            <SheetDescription>Correct or refine justice details while keeping audit history.</SheetDescription>
                          </SheetHeader>
                          <div className="mt-4">
                            <form action={updateAction} className="space-y-3">
                              <input type="hidden" name="episode_id" value={episode.id} />
                              <input type="hidden" name="person_id" value={personId} />
                              {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
                              {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_episode_type_${episode.id}`}>Episode type</Label>
                                  <NativeSelect id={`justice_episode_type_${episode.id}`} name="episode_type" defaultValue={episode.episodeType}>
                                    {EPISODE_TYPES.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_event_date_${episode.id}`}>Event date</Label>
                                  <Input id={`justice_event_date_${episode.id}`} name="event_date" type="date" defaultValue={episode.eventDate} required />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_event_time_${episode.id}`}>Event time</Label>
                                  <Input id={`justice_event_time_${episode.id}`} name="event_time" type="time" defaultValue={episode.eventTime ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_agency_${episode.id}`}>Agency</Label>
                                  <Input id={`justice_agency_${episode.id}`} name="agency" defaultValue={episode.agency ?? ''} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`justice_charges_${episode.id}`}>Charges</Label>
                                <Input id={`justice_charges_${episode.id}`} name="charges" defaultValue={episode.charges ?? ''} />
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_case_number_${episode.id}`}>Case number</Label>
                                  <Input id={`justice_case_number_${episode.id}`} name="case_number" defaultValue={episode.caseNumber ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_bail_amount_${episode.id}`}>Bail amount</Label>
                                  <Input id={`justice_bail_amount_${episode.id}`} name="bail_amount" type="number" min="0" step="0.01" defaultValue={episode.bailAmount ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_booking_${episode.id}`}>Booking number</Label>
                                  <Input id={`justice_booking_${episode.id}`} name="booking_number" defaultValue={episode.bookingNumber ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_disposition_${episode.id}`}>Disposition</Label>
                                  <Input id={`justice_disposition_${episode.id}`} name="disposition" defaultValue={episode.disposition ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_location_${episode.id}`}>Location</Label>
                                  <Input id={`justice_location_${episode.id}`} name="location" defaultValue={episode.location ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_release_type_${episode.id}`}>Release type</Label>
                                  <Input id={`justice_release_type_${episode.id}`} name="release_type" defaultValue={episode.releaseType ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_court_date_${episode.id}`}>Court date</Label>
                                  <Input id={`justice_court_date_${episode.id}`} name="court_date" type="date" defaultValue={episode.courtDate ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_check_in_date_${episode.id}`}>Check-in date</Label>
                                  <Input id={`justice_check_in_date_${episode.id}`} name="check_in_date" type="date" defaultValue={episode.checkInDate ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_release_date_${episode.id}`}>Release date</Label>
                                  <Input id={`justice_release_date_${episode.id}`} name="release_date" type="date" defaultValue={episode.releaseDate ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_supervision_${episode.id}`}>Supervision agency</Label>
                                  <Input id={`justice_supervision_${episode.id}`} name="supervision_agency" defaultValue={episode.supervisionAgency ?? ''} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`justice_notes_${episode.id}`}>Notes</Label>
                                <Textarea id={`justice_notes_${episode.id}`} name="notes" rows={3} defaultValue={episode.notes ?? ''} />
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_source_${episode.id}`}>Source</Label>
                                  <NativeSelect id={`justice_source_${episode.id}`} name="source" defaultValue={episode.source}>
                                    {SOURCE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_verification_${episode.id}`}>Verification</Label>
                                  <NativeSelect id={`justice_verification_${episode.id}`} name="verification_status" defaultValue={episode.verificationStatus}>
                                    {VERIFICATION_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_visibility_${episode.id}`}>Visibility</Label>
                                  <NativeSelect id={`justice_visibility_${episode.id}`} name="visibility_scope" defaultValue={episode.visibilityScope}>
                                    {VISIBILITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`justice_sensitivity_${episode.id}`}>Sensitivity</Label>
                                  <NativeSelect id={`justice_sensitivity_${episode.id}`} name="sensitivity_level" defaultValue={episode.sensitivityLevel}>
                                    {SENSITIVITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`justice_reason_${episode.id}`}>Change reason (optional)</Label>
                                <Textarea id={`justice_reason_${episode.id}`} name="change_reason" rows={2} placeholder="Correction, new info" />
                              </div>

                              <Button type="submit" size="sm">Save changes</Button>
                            </form>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ) : null}
                  </div>
                </div>
                {episode.notes ? <p className="mt-2 text-sm text-foreground/80">{episode.notes}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{episode.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}</Badge>
                  {episode.courtDate ? <Badge variant="secondary">Court date</Badge> : null}
                  {episode.createdByOrg ? <Badge variant="outline">{episode.createdByOrg}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {formVariant === 'inline' ? (
          <details className="rounded-xl border border-dashed border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Add justice update</summary>
            <div className="mt-3">{form}</div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
