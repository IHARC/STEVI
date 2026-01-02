'use client';

import { useEffect, useMemo, useState, useActionState } from 'react';
import { createObservationAction, type ObservationFormState } from '@/lib/observations/actions';
import {
  OBSERVATION_CATEGORIES,
  OBSERVATION_SOURCE_OPTIONS,
  OBSERVATION_VERIFICATION_OPTIONS,
} from '@/lib/observations/constants';
import type { ObservationSubject } from '@/lib/observations/types';
import { formatEnumLabel } from '@/lib/formatters/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { useToast } from '@shared/ui/use-toast';
import { CfsPersonSearch } from '@/components/workspace/cfs/cfs-person-search';

const initialState: ObservationFormState = { status: 'idle' };

const SUBJECT_OPTIONS = [
  { value: 'this_client', label: 'This client' },
  { value: 'known_person', label: 'Another known person' },
  { value: 'named_unlinked', label: 'Named but unlinked' },
  { value: 'unidentified', label: 'Unidentified person' },
];

const VISIBILITY_OPTIONS = [
  { value: 'internal_to_org', label: 'Internal only' },
  { value: 'shared_via_consent', label: 'Share via consent' },
];

const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

type ObservationFormProps = {
  encounterId: string;
  encounterPersonId: number;
  caseId?: number | null;
  canReadSensitive: boolean;
  canReadRestricted: boolean;
};

export function ObservationForm({
  encounterId,
  encounterPersonId,
  caseId,
  canReadSensitive,
  canReadRestricted,
}: ObservationFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createObservationAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Observation saved', description: 'Observation added to the encounter.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Observation not saved', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const formKey = state.status === 'success' && state.observationId
    ? state.observationId
    : 'observation-form';

  return (
    <ObservationFormContents
      key={formKey}
      encounterId={encounterId}
      encounterPersonId={encounterPersonId}
      caseId={caseId}
      canReadSensitive={canReadSensitive}
      canReadRestricted={canReadRestricted}
      formAction={formAction}
    />
  );
}

type ObservationFormContentsProps = ObservationFormProps & {
  formAction: (payload: FormData) => void;
};

function ObservationFormContents({
  encounterId,
  encounterPersonId,
  caseId,
  canReadSensitive,
  canReadRestricted,
  formAction,
}: ObservationFormContentsProps) {
  const [subjectType, setSubjectType] = useState<ObservationSubject>('this_client');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);

  const showKnownPerson = subjectType === 'known_person';
  const showNamedUnlinked = subjectType === 'named_unlinked';
  const showUnidentified = subjectType === 'unidentified';
  const showThirdParty = subjectType !== 'this_client';
  const allowFollowUp = subjectType === 'this_client' || subjectType === 'known_person';

  const sensitivityOptions = useMemo(() => {
    const options = [{ value: 'standard', label: 'Standard' }];
    if (canReadSensitive || canReadRestricted) {
      options.push({ value: 'sensitive', label: 'Sensitive' });
    }
    if (canReadRestricted) {
      options.push({ value: 'high', label: 'High' }, { value: 'restricted', label: 'Restricted' });
    }
    return options;
  }, [canReadSensitive, canReadRestricted]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Add observation</CardTitle>
        <CardDescription>Capture staff-observed or client-reported information from this encounter.</CardDescription>
        {showThirdParty ? (
          <Badge variant="outline" className="w-fit">Third-party observations are internal-only</Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="encounter_id" value={encounterId} />
          <input type="hidden" name="encounter_person_id" value={encounterPersonId} />
          {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}

          <div className="space-y-1">
            <Label htmlFor="observation_subject">Subject</Label>
            <NativeSelect
              id="observation_subject"
              name="subject_type"
              value={subjectType}
              onChange={(event) => setSubjectType(event.target.value as ObservationSubject)}
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </NativeSelect>
          </div>

          {showKnownPerson ? (
            <CfsPersonSearch
              name="subject_person_id"
              label="Known person"
              placeholder="Search by name"
              helperText="Select the person this observation is about."
              required
            />
          ) : null}

          {showNamedUnlinked ? (
            <div className="space-y-1">
              <Label htmlFor="observation_subject_name">Named person</Label>
              <Input id="observation_subject_name" name="subject_name" placeholder="Name or identifier" required />
            </div>
          ) : null}

          {showNamedUnlinked ? (
            <div className="space-y-1">
              <Label htmlFor="observation_subject_description">Description (optional)</Label>
              <Textarea id="observation_subject_description" name="subject_description" rows={2} />
            </div>
          ) : null}

          {showUnidentified ? (
            <div className="space-y-1">
              <Label htmlFor="observation_subject_description_required">Description</Label>
              <Textarea id="observation_subject_description_required" name="subject_description" rows={3} required />
            </div>
          ) : null}

          {(showNamedUnlinked || showUnidentified) ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="observation_last_seen_at">Last seen</Label>
                <Input id="observation_last_seen_at" name="last_seen_at" type="datetime-local" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="observation_last_seen_location">Last seen location</Label>
                <Input id="observation_last_seen_location" name="last_seen_location" placeholder="Street, shelter, program" />
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="observation_category">Category</Label>
            <NativeSelect id="observation_category" name="category" defaultValue="" required>
              <option value="" disabled>Select category</option>
              {OBSERVATION_CATEGORIES.map((category) => (
                <option key={category} value={category}>{formatEnumLabel(category)}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <Label htmlFor="observation_summary">Summary</Label>
            <Input id="observation_summary" name="summary" placeholder="Short summary" required minLength={3} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observation_details">Details</Label>
            <Textarea id="observation_details" name="details" rows={3} placeholder="Add context (optional)" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="observation_source">Source</Label>
              <NativeSelect id="observation_source" name="source" defaultValue="staff_observed">
                {OBSERVATION_SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>{formatEnumLabel(source)}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="observation_verification">Verification</Label>
              <NativeSelect id="observation_verification" name="verification_status" defaultValue="unverified">
                {OBSERVATION_VERIFICATION_OPTIONS.map((status) => (
                  <option key={status} value={status}>{formatEnumLabel(status)}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {showThirdParty ? (
            <input type="hidden" name="visibility_scope" value="internal_to_org" />
          ) : (
            <div className="space-y-1">
              <Label htmlFor="observation_visibility">Visibility</Label>
              <NativeSelect id="observation_visibility" name="visibility_scope" defaultValue="internal_to_org">
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="observation_sensitivity">Sensitivity</Label>
            <NativeSelect id="observation_sensitivity" name="sensitivity_level" defaultValue="standard">
              {sensitivityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <input
                id="observation_follow_up_needed"
                name="follow_up_needed"
                type="checkbox"
                checked={followUpEnabled}
                onChange={(event) => setFollowUpEnabled(event.target.checked)}
                disabled={!allowFollowUp}
              />
              <Label htmlFor="observation_follow_up_needed">Create follow-up task</Label>
              {!allowFollowUp ? (
                <span className="text-xs text-muted-foreground">Requires a known person</span>
              ) : null}
            </div>

            {followUpEnabled && allowFollowUp ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="observation_follow_up_title">Task title</Label>
                  <Input id="observation_follow_up_title" name="follow_up_title" placeholder="Follow up on observation" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="observation_follow_up_notes">Task notes</Label>
                  <Textarea id="observation_follow_up_notes" name="follow_up_notes" rows={2} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="observation_follow_up_due">Due date</Label>
                    <Input id="observation_follow_up_due" name="follow_up_due_at" type="date" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="observation_follow_up_priority">Priority</Label>
                    <NativeSelect id="observation_follow_up_priority" name="follow_up_priority" defaultValue="normal">
                      {TASK_PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <Button type="submit" size="sm">Save observation</Button>
        </form>
      </CardContent>
    </Card>
  );
}
