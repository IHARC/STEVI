'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Separator } from '@shared/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import { updatePersonContactAction } from '@/lib/client-record/actions';
import { clientRecordInitialState } from '@/lib/client-record/form-state';
import type { ClientPersonSummary } from '@/lib/client-record/types';

const CONTACT_METHOD_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'Do not contact' },
];

type ProfileCardProps = {
  person: ClientPersonSummary;
  consentLabel: string;
  orgLabel: string;
  canEdit?: boolean;
};

export function ProfileCard({ person, consentLabel, orgLabel, canEdit = false }: ProfileCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updatePersonContactAction, clientRecordInitialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Contact updated', description: state.message ?? 'Contact details saved.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Contact update failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Record details</CardTitle>
          <CardDescription>Contact, sharing, and record provenance.</CardDescription>
        </div>
        {canEdit ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Edit contact</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Edit contact</SheetTitle>
                <SheetDescription>Update the preferred way to reach this client.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <form action={formAction} className="space-y-3">
                  <input type="hidden" name="person_id" value={person.id} />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input id="contact_email" name="email" type="email" defaultValue={person.email ?? ''} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input id="contact_phone" name="phone" defaultValue={person.phone ?? ''} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="contact_method">Preferred contact method</Label>
                    <NativeSelect id="contact_method" name="preferred_contact_method" defaultValue={person.preferred_contact_method ?? ''}>
                      {CONTACT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="contact_change_reason">Change reason (optional)</Label>
                    <Textarea id="contact_change_reason" name="change_reason" rows={2} placeholder="Correction, new info" />
                  </div>

                  <Button type="submit" size="sm">Save contact</Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground/80">
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Contact</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground">{person.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">{person.phone ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferred contact</dt>
              <dd className="font-medium text-foreground">{person.preferred_contact_method ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <Separator />
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Sharing</p>
          <p className="text-sm font-medium text-foreground">{consentLabel}</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Provenance</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Created by</dt>
              <dd className="font-medium text-foreground">{orgLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Created</dt>
              <dd className="font-medium text-foreground">{formatDate(person.created_at)}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value ?? '—';
  }
}
