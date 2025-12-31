'use client';

import { useEffect, useActionState } from 'react';

import type { MedicalEpisodeSummary } from '@/lib/medical/types';
import {
  createMedicalEpisodeAction,
  updateMedicalEpisodeAction,
  type MedicalEpisodeFormState,
  type MedicalEpisodeUpdateState,
} from '@/lib/medical/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';

const initialState: MedicalEpisodeFormState = { status: 'idle' };
const updateInitialState: MedicalEpisodeUpdateState = { status: 'idle' };

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

const SEVERITY_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const FOLLOW_UP_OPTIONS = [
  { value: '', label: 'Not needed' },
  { value: 'immediate', label: 'Immediate' },
  { value: 'urgent', label: 'Urgent (48h)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'routine', label: 'Routine' },
  { value: 'client_initiated', label: 'Client initiated' },
];

type MedicalEpisodesCardProps = {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  episodes: MedicalEpisodeSummary[];
  formVariant?: 'inline' | 'sheet';
  canEdit?: boolean;
};

export function MedicalEpisodesCard({
  personId,
  caseId,
  encounterId,
  episodes,
  formVariant = 'inline',
  canEdit = false,
}: MedicalEpisodesCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createMedicalEpisodeAction, initialState);
  const [updateState, updateAction] = useActionState(updateMedicalEpisodeAction, updateInitialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Medical update saved', description: state.message ?? 'Medical history updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Medical update failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  useEffect(() => {
    if (updateState.status === 'success') {
      toast({ title: 'Medical update revised', description: updateState.message ?? 'Medical history updated.' });
    }
    if (updateState.status === 'error') {
      toast({ title: 'Medical update failed', description: updateState.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [updateState, toast]);

  const form = (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
      {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_episode_type">Episode type</Label>
          <Input id="medical_episode_type" name="episode_type" placeholder="Overdose, wound care" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_primary_condition">Primary condition</Label>
          <Input id="medical_primary_condition" name="primary_condition" placeholder="Opioid overdose" required />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_episode_date">Episode date</Label>
          <Input id="medical_episode_date" name="episode_date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_episode_end_date">Episode end date</Label>
          <Input id="medical_episode_end_date" name="episode_end_date" type="date" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_severity_level">Severity</Label>
          <NativeSelect id="medical_severity_level" name="severity_level" defaultValue="">
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_location_occurred">Location occurred</Label>
          <Input id="medical_location_occurred" name="location_occurred" placeholder="Shelter, street, clinic" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="medical_assessment_summary">Assessment summary</Label>
        <Textarea id="medical_assessment_summary" name="assessment_summary" rows={3} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="medical_plan_summary">Plan summary</Label>
        <Textarea id="medical_plan_summary" name="plan_summary" rows={3} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="medical_follow_up_notes">Follow-up notes</Label>
        <Textarea id="medical_follow_up_notes" name="follow_up_notes" rows={2} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="medical_outcome">Outcome</Label>
        <Input id="medical_outcome" name="outcome" placeholder="Resolved, ongoing, referred" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_follow_up_timeline">Follow-up timeline</Label>
          <NativeSelect id="medical_follow_up_timeline" name="follow_up_timeline" defaultValue="">
            {FOLLOW_UP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_follow_up_needed">Follow-up needed</Label>
          <div className="flex items-center gap-2">
            <input id="medical_follow_up_needed" name="follow_up_needed" type="checkbox" />
            <span className="text-xs text-muted-foreground">Create a follow-up task if needed.</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_source">Source</Label>
          <NativeSelect id="medical_source" name="source" defaultValue="staff_observed">
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_verification">Verification</Label>
          <NativeSelect id="medical_verification" name="verification_status" defaultValue="unverified">
            {VERIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="medical_visibility">Visibility</Label>
          <NativeSelect id="medical_visibility" name="visibility_scope" defaultValue="internal_to_org">
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="medical_sensitivity">Sensitivity</Label>
          <NativeSelect id="medical_sensitivity" name="sensitivity_level" defaultValue="standard">
            {SENSITIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <Button type="submit" size="sm">Save medical update</Button>
    </form>
  );

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Medical history</CardTitle>
          <CardDescription>Document clinical observations and follow-ups.</CardDescription>
        </div>
        {formVariant === 'sheet' ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Add medical update</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Add medical update</SheetTitle>
                <SheetDescription>Capture clinical observations and follow-ups.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{form}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medical updates recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{episode.primaryCondition}</p>
                    <p className="text-xs text-muted-foreground">{episode.episodeType}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(episode.episodeDate).toLocaleDateString()}</span>
                    {canEdit ? (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto sm:max-w-xl">
                          <SheetHeader className="text-left">
                            <SheetTitle>Edit medical update</SheetTitle>
                            <SheetDescription>Correct or refine details while keeping audit history.</SheetDescription>
                          </SheetHeader>
                          <div className="mt-4">
                            <form action={updateAction} className="space-y-3">
                              <input type="hidden" name="episode_id" value={episode.id} />
                              <input type="hidden" name="person_id" value={personId} />
                              {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
                              {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_episode_type_${episode.id}`}>Episode type</Label>
                                  <Input id={`edit_episode_type_${episode.id}`} name="episode_type" defaultValue={episode.episodeType} required />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_primary_condition_${episode.id}`}>Primary condition</Label>
                                  <Input id={`edit_primary_condition_${episode.id}`} name="primary_condition" defaultValue={episode.primaryCondition} required />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_episode_date_${episode.id}`}>Episode date</Label>
                                  <Input id={`edit_episode_date_${episode.id}`} name="episode_date" type="date" defaultValue={episode.episodeDate} required />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_episode_end_date_${episode.id}`}>Episode end date</Label>
                                  <Input id={`edit_episode_end_date_${episode.id}`} name="episode_end_date" type="date" defaultValue={episode.episodeEndDate ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_severity_${episode.id}`}>Severity</Label>
                                  <NativeSelect id={`edit_severity_${episode.id}`} name="severity_level" defaultValue={episode.severityLevel ?? ''}>
                                    {SEVERITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_location_${episode.id}`}>Location occurred</Label>
                                  <Input id={`edit_location_${episode.id}`} name="location_occurred" defaultValue={episode.locationOccurred ?? ''} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`edit_assessment_${episode.id}`}>Assessment summary</Label>
                                <Textarea id={`edit_assessment_${episode.id}`} name="assessment_summary" rows={3} defaultValue={episode.assessmentSummary ?? ''} />
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`edit_plan_${episode.id}`}>Plan summary</Label>
                                <Textarea id={`edit_plan_${episode.id}`} name="plan_summary" rows={3} defaultValue={episode.planSummary ?? ''} />
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`edit_follow_up_${episode.id}`}>Follow-up notes</Label>
                                <Textarea id={`edit_follow_up_${episode.id}`} name="follow_up_notes" rows={2} defaultValue={episode.followUpNotes ?? ''} />
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_follow_up_timeline_${episode.id}`}>Follow-up timeline</Label>
                                  <NativeSelect id={`edit_follow_up_timeline_${episode.id}`} name="follow_up_timeline" defaultValue={episode.followUpTimeline ?? ''}>
                                    {FOLLOW_UP_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_follow_up_needed_${episode.id}`}>Follow-up needed</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`edit_follow_up_needed_${episode.id}`}
                                      name="follow_up_needed"
                                      type="checkbox"
                                      defaultChecked={Boolean(episode.followUpNeeded)}
                                    />
                                    <span className="text-xs text-muted-foreground">Create a follow-up task if needed.</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`edit_outcome_${episode.id}`}>Outcome</Label>
                                <Input id={`edit_outcome_${episode.id}`} name="outcome" defaultValue={episode.outcome ?? ''} />
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_source_${episode.id}`}>Source</Label>
                                  <NativeSelect id={`edit_source_${episode.id}`} name="source" defaultValue={episode.source}>
                                    {SOURCE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_verification_${episode.id}`}>Verification</Label>
                                  <NativeSelect id={`edit_verification_${episode.id}`} name="verification_status" defaultValue={episode.verificationStatus}>
                                    {VERIFICATION_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_visibility_${episode.id}`}>Visibility</Label>
                                  <NativeSelect id={`edit_visibility_${episode.id}`} name="visibility_scope" defaultValue={episode.visibilityScope}>
                                    {VISIBILITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit_sensitivity_${episode.id}`}>Sensitivity</Label>
                                  <NativeSelect id={`edit_sensitivity_${episode.id}`} name="sensitivity_level" defaultValue={episode.sensitivityLevel}>
                                    {SENSITIVITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`edit_reason_${episode.id}`}>Change reason (optional)</Label>
                                <Textarea id={`edit_reason_${episode.id}`} name="change_reason" rows={2} placeholder="Correction, new info" />
                              </div>

                              <Button type="submit" size="sm">Save changes</Button>
                            </form>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ) : null}
                  </div>
                </div>
                {episode.assessmentSummary ? (
                  <p className="mt-2 text-sm text-foreground/80">{episode.assessmentSummary}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{episode.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}</Badge>
                  {episode.followUpNeeded ? <Badge variant="secondary">Follow-up</Badge> : null}
                  {episode.createdByOrg ? <Badge variant="outline">{episode.createdByOrg}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {formVariant === 'inline' ? (
          <details className="rounded-xl border border-dashed border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Add medical update</summary>
            <div className="mt-3">{form}</div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
