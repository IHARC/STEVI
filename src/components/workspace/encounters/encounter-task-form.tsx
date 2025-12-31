'use client';

import { useEffect, useActionState } from 'react';

import { createTaskAction, type TaskFormState } from '@/lib/tasks/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { useToast } from '@shared/ui/use-toast';

const initialState: TaskFormState = { status: 'idle' };

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
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

type EncounterTaskFormProps = {
  personId: number;
  caseId?: number | null;
  encounterId: string;
};

export function EncounterTaskForm({ personId, caseId, encounterId }: EncounterTaskFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createTaskAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Task created', description: 'Task added to the encounter.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Task not saved', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Add task</CardTitle>
        <CardDescription>Track follow-ups tied to this encounter.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="person_id" value={personId} />
          {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
          <input type="hidden" name="encounter_id" value={encounterId} />

          <div className="space-y-1">
            <Label htmlFor="task_title">Title</Label>
            <Input id="task_title" name="title" placeholder="Follow up on housing referral" required minLength={3} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="task_description">Details</Label>
            <Textarea id="task_description" name="description" rows={3} placeholder="Add context (optional)" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="task_due">Due date</Label>
              <Input id="task_due" name="due_at" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task_priority">Priority</Label>
              <NativeSelect id="task_priority" name="priority" defaultValue="normal">
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="task_visibility">Visibility</Label>
              <NativeSelect id="task_visibility" name="visibility_scope" defaultValue="internal_to_org">
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="task_sensitivity">Sensitivity</Label>
              <NativeSelect id="task_sensitivity" name="sensitivity_level" defaultValue="standard">
                {SENSITIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Button type="submit" size="sm">Save task</Button>
        </form>
      </CardContent>
    </Card>
  );
}
