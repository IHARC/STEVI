'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import type { CharacteristicSummary } from '@/lib/characteristics/types';
import { createCharacteristicAction, type CharacteristicFormState } from '@/lib/characteristics/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { useToast } from '@shared/ui/use-toast';

const initialState: CharacteristicFormState = { status: 'idle' };

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

type CharacteristicsCardProps = {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  characteristics: CharacteristicSummary[];
};

export function CharacteristicsCard({ personId, caseId, encounterId, characteristics }: CharacteristicsCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useFormState(createCharacteristicAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Characteristic saved', description: state.message ?? 'Characteristic updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Characteristic failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Characteristics</CardTitle>
        <CardDescription>Record observable traits or measurements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {characteristics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No characteristics recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {characteristics.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{item.characteristicType}</p>
                    {item.valueText ? <p className="text-xs text-muted-foreground">{item.valueText}</p> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(item.observedAt).toLocaleDateString()}</div>
                </div>
                {item.notes ? <p className="mt-2 text-sm text-foreground/80">{item.notes}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{item.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}</Badge>
                  {item.createdByOrg ? <Badge variant="outline">{item.createdByOrg}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <details className="rounded-xl border border-dashed border-border/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Add characteristic</summary>
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="person_id" value={personId} />
            {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
            {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="characteristic_type">Characteristic type</Label>
                <Input id="characteristic_type" name="characteristic_type" placeholder="Mobility, tattoo" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="observed_at">Observed at</Label>
                <Input id="observed_at" name="observed_at" type="datetime-local" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="value_text">Value (text)</Label>
                <Input id="value_text" name="value_text" placeholder="Visible" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="value_number">Value (number)</Label>
                <Input id="value_number" name="value_number" type="number" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="value_unit">Unit</Label>
                <Input id="value_unit" name="value_unit" placeholder="cm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="body_location">Body location</Label>
              <Input id="body_location" name="body_location" placeholder="Left forearm" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="characteristic_notes">Notes</Label>
              <Textarea id="characteristic_notes" name="notes" rows={2} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="characteristic_source">Source</Label>
                <NativeSelect id="characteristic_source" name="source" defaultValue="staff_observed">
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="characteristic_verification">Verification</Label>
                <NativeSelect id="characteristic_verification" name="verification_status" defaultValue="unverified">
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="characteristic_visibility">Visibility</Label>
                <NativeSelect id="characteristic_visibility" name="visibility_scope" defaultValue="internal_to_org">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="characteristic_sensitivity">Sensitivity</Label>
                <NativeSelect id="characteristic_sensitivity" name="sensitivity_level" defaultValue="standard">
                  {SENSITIVITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <Button type="submit" size="sm">Save characteristic</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
