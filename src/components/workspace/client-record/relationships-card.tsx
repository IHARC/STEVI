'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import type { RelationshipSummary } from '@/lib/relationships/types';
import { createRelationshipAction, type RelationshipFormState } from '@/lib/relationships/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { useToast } from '@shared/ui/use-toast';

const initialState: RelationshipFormState = { status: 'idle' };

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

type RelationshipsCardProps = {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  relationships: RelationshipSummary[];
};

export function RelationshipsCard({ personId, caseId, encounterId, relationships }: RelationshipsCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useFormState(createRelationshipAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Relationship saved', description: state.message ?? 'Relationship updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Relationship failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Relationships</CardTitle>
        <CardDescription>Track supports, contacts, and safe-to-contact notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {relationships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No relationships recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {relationships.map((relationship) => (
              <div key={relationship.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {relationship.contactName ?? relationship.relatedPersonName ?? 'Contact'}
                    </p>
                    <p className="text-xs text-muted-foreground">{relationship.relationshipType}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(relationship.recordedAt).toLocaleDateString()}
                  </div>
                </div>
                {relationship.notes ? <p className="mt-2 text-sm text-foreground/80">{relationship.notes}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {relationship.isEmergency ? <Badge variant="destructive">Emergency</Badge> : null}
                  {relationship.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                  <Badge variant="outline">{relationship.safeToContact ? 'Safe to contact' : 'Do not contact'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <details className="rounded-xl border border-dashed border-border/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Add relationship</summary>
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="person_id" value={personId} />
            {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
            {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="relationship_type">Relationship type</Label>
                <Input id="relationship_type" name="relationship_type" placeholder="Family, shelter, outreach" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="relationship_subtype">Subtype</Label>
                <Input id="relationship_subtype" name="relationship_subtype" placeholder="Sibling, shelter staff" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="relationship_status">Status</Label>
              <Input id="relationship_status" name="relationship_status" placeholder="Active, estranged, supportive" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="related_person_id">Related person ID</Label>
                <Input id="related_person_id" name="related_person_id" type="number" placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_name">Contact name</Label>
                <Input id="contact_name" name="contact_name" placeholder="Contact name" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" name="contact_phone" placeholder="Phone number" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="contact_email" type="email" placeholder="Email" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact_address">Address</Label>
              <Input id="contact_address" name="contact_address" placeholder="Address" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="relationship_start_date">Start date</Label>
                <Input id="relationship_start_date" name="start_date" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="relationship_end_date">End date</Label>
                <Input id="relationship_end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <input id="is_primary" name="is_primary" type="checkbox" />
                <Label htmlFor="is_primary">Primary contact</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="is_emergency" name="is_emergency" type="checkbox" />
                <Label htmlFor="is_emergency">Emergency contact</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="safe_to_contact" name="safe_to_contact" type="checkbox" defaultChecked />
              <Label htmlFor="safe_to_contact">Safe to contact</Label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="safe_contact_notes">Safe contact notes</Label>
              <Textarea id="safe_contact_notes" name="safe_contact_notes" rows={2} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="relationship_notes">Notes</Label>
              <Textarea id="relationship_notes" name="notes" rows={2} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="relationship_source">Source</Label>
                <NativeSelect id="relationship_source" name="source" defaultValue="staff_observed">
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="relationship_verification">Verification</Label>
                <NativeSelect id="relationship_verification" name="verification_status" defaultValue="unverified">
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="relationship_visibility">Visibility</Label>
                <NativeSelect id="relationship_visibility" name="visibility_scope" defaultValue="internal_to_org">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="relationship_sensitivity">Sensitivity</Label>
                <NativeSelect id="relationship_sensitivity" name="sensitivity_level" defaultValue="standard">
                  {SENSITIVITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <Button type="submit" size="sm">Save relationship</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
