'use client';

import { useActionState } from 'react';

import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { NativeCheckbox } from '@shared/ui/native-checkbox';
import { Textarea } from '@shared/ui/textarea';
import { DISPATCH_PRIORITY_OPTIONS, INCIDENT_TYPE_OPTIONS, formatCfsLabel } from '@/lib/cfs/constants';
import { initialIncidentActionState, updateIncidentAction } from '@/app/(ops)/ops/incidents/actions';
import type { IncidentRow } from '@/lib/cfs/queries';

const INCIDENT_STATUS_OPTIONS = ['draft', 'open', 'in_progress', 'resolved', 'closed'] as const;

type IncidentDetailFormProps = {
  incident: IncidentRow;
};

function toLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function IncidentDetailForm({ incident }: IncidentDetailFormProps) {
  const [state, formAction] = useActionState(updateIncidentAction, initialIncidentActionState);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-xl">Incident details</CardTitle>
        <CardDescription>Update field response information and milestones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="incident_id" value={incident.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incident_type">Incident type</Label>
              <NativeSelect id="incident_type" name="incident_type" defaultValue={incident.incident_type ?? ''}>
                <option value="">Select type</option>
                {INCIDENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatCfsLabel(option)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={incident.status ?? 'open'}>
                {INCIDENT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatCfsLabel(option)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch_priority">Dispatch priority</Label>
              <NativeSelect id="dispatch_priority" name="dispatch_priority" defaultValue={incident.dispatch_priority ?? ''}>
                <option value="">Select priority</option>
                {DISPATCH_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatCfsLabel(option)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={incident.location ?? ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Incident description</Label>
            <Textarea id="description" name="description" defaultValue={incident.description ?? ''} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="actions_taken">Actions taken</Label>
              <Textarea id="actions_taken" name="actions_taken" defaultValue={incident.actions_taken ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services_offered">Services offered (comma separated)</Label>
              <Input id="services_offered" name="services_offered" defaultValue={incident.services_offered?.join(', ') ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services_provided">Services provided (comma separated)</Label>
              <Input id="services_provided" name="services_provided" defaultValue={incident.services_provided?.join(', ') ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resources_distributed">Resources distributed (comma separated)</Label>
              <Input id="resources_distributed" name="resources_distributed" defaultValue={incident.resources_distributed?.join(', ') ?? ''} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dispatch_at">Dispatch time</Label>
              <Input id="dispatch_at" name="dispatch_at" type="datetime-local" defaultValue={toLocalDateTime(incident.dispatch_at)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_unit_assigned_at">First unit assigned</Label>
              <Input id="first_unit_assigned_at" name="first_unit_assigned_at" type="datetime-local" defaultValue={toLocalDateTime(incident.first_unit_assigned_at)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_unit_arrived_at">First unit arrived</Label>
              <Input id="first_unit_arrived_at" name="first_unit_arrived_at" type="datetime-local" defaultValue={toLocalDateTime(incident.first_unit_arrived_at)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_cleared_at">Incident cleared</Label>
              <Input id="incident_cleared_at" name="incident_cleared_at" type="datetime-local" defaultValue={toLocalDateTime(incident.incident_cleared_at)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Follow-up required</p>
                <p className="text-xs text-muted-foreground">Track follow-up tasks and due dates.</p>
              </div>
              <NativeCheckbox name="follow_up_required" defaultChecked={incident.follow_up_required ?? false} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="follow_up_date">Follow-up date</Label>
                <Input id="follow_up_date" name="follow_up_date" type="date" defaultValue={incident.follow_up_date ?? ''} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="follow_up_notes">Follow-up notes</Label>
                <Textarea id="follow_up_notes" name="follow_up_notes" defaultValue={incident.follow_up_notes ?? ''} />
              </div>
            </div>
          </div>

          {state.message ? (
            <p className={`text-xs ${state.status === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit">Save updates</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
