'use client';

import { useEffect, useActionState } from 'react';

import type { RelationshipSummary } from '@/lib/relationships/types';
import {
  createRelationshipAction,
  updateRelationshipAction,
  type RelationshipFormState,
  type RelationshipUpdateState,
} from '@/lib/relationships/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';

const initialState: RelationshipFormState = { status: 'idle' };
const updateInitialState: RelationshipUpdateState = { status: 'idle' };

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
  formVariant?: 'inline' | 'sheet';
  canEdit?: boolean;
};

export function RelationshipsCard({
  personId,
  caseId,
  encounterId,
  relationships,
  formVariant = 'inline',
  canEdit = false,
}: RelationshipsCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createRelationshipAction, initialState);
  const [updateState, updateAction] = useActionState(updateRelationshipAction, updateInitialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Relationship saved', description: state.message ?? 'Relationship updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Relationship failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  useEffect(() => {
    if (updateState.status === 'success') {
      toast({ title: 'Relationship updated', description: updateState.message ?? 'Relationship updated.' });
    }
    if (updateState.status === 'error') {
      toast({ title: 'Relationship update failed', description: updateState.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [updateState, toast]);

  const form = (
    <form action={formAction} className="space-y-3">
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
  );

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Relationships</CardTitle>
          <CardDescription>Track supports, contacts, and safe-to-contact notes.</CardDescription>
        </div>
        {formVariant === 'sheet' ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Add relationship</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Add relationship</SheetTitle>
                <SheetDescription>Capture contacts and safe-to-contact notes.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{form}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {relationships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No relationships recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {relationships.map((relationship) => (
              <div key={relationship.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {relationship.contactName ?? relationship.relatedPersonName ?? 'Contact'}
                    </p>
                    <p className="text-xs text-muted-foreground">{relationship.relationshipType}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(relationship.recordedAt).toLocaleDateString()}</span>
                    {canEdit ? (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto sm:max-w-xl">
                          <SheetHeader className="text-left">
                            <SheetTitle>Edit relationship</SheetTitle>
                            <SheetDescription>Correct or update relationship details.</SheetDescription>
                          </SheetHeader>
                          <div className="mt-4">
                            <form action={updateAction} className="space-y-3">
                              <input type="hidden" name="relationship_id" value={relationship.id} />
                              <input type="hidden" name="person_id" value={personId} />
                              {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
                              {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_type_${relationship.id}`}>Relationship type</Label>
                                  <Input id={`relationship_type_${relationship.id}`} name="relationship_type" defaultValue={relationship.relationshipType} required />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_subtype_${relationship.id}`}>Subtype</Label>
                                  <Input id={`relationship_subtype_${relationship.id}`} name="relationship_subtype" defaultValue={relationship.relationshipSubtype ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_status_${relationship.id}`}>Status</Label>
                                  <Input id={`relationship_status_${relationship.id}`} name="relationship_status" defaultValue={relationship.relationshipStatus ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_related_${relationship.id}`}>Related person ID</Label>
                                  <Input id={`relationship_related_${relationship.id}`} name="related_person_id" type="number" defaultValue={relationship.relatedPersonId ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_contact_name_${relationship.id}`}>Contact name</Label>
                                  <Input id={`relationship_contact_name_${relationship.id}`} name="contact_name" defaultValue={relationship.contactName ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_contact_phone_${relationship.id}`}>Contact phone</Label>
                                  <Input id={`relationship_contact_phone_${relationship.id}`} name="contact_phone" defaultValue={relationship.contactPhone ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_contact_email_${relationship.id}`}>Contact email</Label>
                                  <Input id={`relationship_contact_email_${relationship.id}`} name="contact_email" defaultValue={relationship.contactEmail ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_contact_address_${relationship.id}`}>Contact address</Label>
                                  <Input id={`relationship_contact_address_${relationship.id}`} name="contact_address" defaultValue={relationship.contactAddress ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_start_${relationship.id}`}>Start date</Label>
                                  <Input id={`relationship_start_${relationship.id}`} name="start_date" type="date" defaultValue={relationship.startDate ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_end_${relationship.id}`}>End date</Label>
                                  <Input id={`relationship_end_${relationship.id}`} name="end_date" type="date" defaultValue={relationship.endDate ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_safe_notes_${relationship.id}`}>Safe contact notes</Label>
                                  <Textarea id={`relationship_safe_notes_${relationship.id}`} name="safe_contact_notes" rows={2} defaultValue={relationship.safeContactNotes ?? ''} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_notes_${relationship.id}`}>Notes</Label>
                                  <Textarea id={`relationship_notes_${relationship.id}`} name="notes" rows={2} defaultValue={relationship.notes ?? ''} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3">
                                <label className="flex items-center gap-2 text-sm">
                                  <input name="is_primary" type="checkbox" defaultChecked={relationship.isPrimary} />
                                  Primary contact
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <input name="is_emergency" type="checkbox" defaultChecked={relationship.isEmergency} />
                                  Emergency contact
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <input name="safe_to_contact" type="checkbox" defaultChecked={relationship.safeToContact} />
                                  Safe to contact
                                </label>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_source_${relationship.id}`}>Source</Label>
                                  <NativeSelect id={`relationship_source_${relationship.id}`} name="source" defaultValue={relationship.source}>
                                    {SOURCE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_verification_${relationship.id}`}>Verification</Label>
                                  <NativeSelect id={`relationship_verification_${relationship.id}`} name="verification_status" defaultValue={relationship.verificationStatus}>
                                    {VERIFICATION_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_visibility_${relationship.id}`}>Visibility</Label>
                                  <NativeSelect id={`relationship_visibility_${relationship.id}`} name="visibility_scope" defaultValue={relationship.visibilityScope}>
                                    {VISIBILITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`relationship_sensitivity_${relationship.id}`}>Sensitivity</Label>
                                  <NativeSelect id={`relationship_sensitivity_${relationship.id}`} name="sensitivity_level" defaultValue={relationship.sensitivityLevel}>
                                    {SENSITIVITY_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </NativeSelect>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`relationship_reason_${relationship.id}`}>Change reason (optional)</Label>
                                <Textarea id={`relationship_reason_${relationship.id}`} name="change_reason" rows={2} placeholder="Correction, new info" />
                              </div>

                              <Button type="submit" size="sm">Save changes</Button>
                            </form>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ) : null}
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

        {formVariant === 'inline' ? (
          <details className="rounded-xl border border-dashed border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Add relationship</summary>
            <div className="mt-3">{form}</div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
