'use client';

import { useEffect, useActionState } from 'react';

import { useRouter } from 'next/navigation';
import { createEncounterAction, type EncounterFormState } from '@/lib/encounters/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { useToast } from '@shared/ui/use-toast';

const initialState: EncounterFormState = { status: 'idle' };

const ENCOUNTER_TYPES = [
  { value: 'outreach', label: 'Outreach' },
  { value: 'intake', label: 'Intake' },
  { value: 'program', label: 'Program' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'other', label: 'Other' },
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

type EncounterCreateFormProps = {
  personId: number;
  caseId?: number | null;
  programContext?: string | null;
  locationContext?: string | null;
  defaultEncounterType?: string | null;
};

export function EncounterCreateForm({
  personId,
  caseId,
  programContext,
  locationContext,
  defaultEncounterType,
}: EncounterCreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction] = useActionState(createEncounterAction, initialState);

  useEffect(() => {
    if (state.status === 'success' && state.encounterId) {
      toast({ title: 'Encounter started', description: 'Redirecting to encounter workspace.' });
      router.push(`/ops/encounters/${state.encounterId}`);
    }
    if (state.status === 'error') {
      toast({ title: 'Encounter not saved', description: state.message ?? 'Check the details and try again.', variant: 'destructive' });
    }
  }, [router, state, toast]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-xl">Start encounter</CardTitle>
        <CardDescription>Capture the who/when/where before logging tasks, supplies, or domain updates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="person_id" value={personId} />
          {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="encounter_type">Encounter type</Label>
              <NativeSelect id="encounter_type" name="encounter_type" defaultValue={defaultEncounterType ?? 'outreach'}>
                {ENCOUNTER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="started_at">Started at</Label>
              <Input id="started_at" name="started_at" type="datetime-local" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="location_context">Location</Label>
              <Input
                id="location_context"
                name="location_context"
                placeholder="Downtown outreach"
                defaultValue={locationContext ?? ''}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="program_context">Program</Label>
              <Input
                id="program_context"
                name="program_context"
                placeholder="Warming room"
                defaultValue={programContext ?? ''}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="summary">Summary</Label>
            <Input id="summary" name="summary" placeholder="Brief encounter summary" maxLength={200} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={4} placeholder="Add encounter notes (optional)" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="visibility_scope">Visibility</Label>
              <NativeSelect id="visibility_scope" name="visibility_scope" defaultValue="internal_to_org">
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sensitivity_level">Sensitivity</Label>
              <NativeSelect id="sensitivity_level" name="sensitivity_level" defaultValue="standard">
                {SENSITIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Button type="submit">Start encounter</Button>
        </form>
      </CardContent>
    </Card>
  );
}
