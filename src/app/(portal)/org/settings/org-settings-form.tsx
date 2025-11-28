'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { updateOrgSettingsAction, type OrgSettingsFormState } from './actions';

const initialState: OrgSettingsFormState = { status: 'idle' };

type ContactValues = {
  contact_person: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
};

type NotesValues = {
  referral_process: string | null;
  special_requirements: string | null;
  availability_notes: string | null;
};

export function OrgContactSettingsForm({ initialValues }: { initialValues: ContactValues }) {
  const { toast } = useToast();
  const router = useRouter();
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Contact saved', description: 'Organization contact details updated.' });
      router.refresh();
    } else if (state.status === 'error' && state.message) {
      toast({ title: 'Save failed', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-lg">Contact & visibility</CardTitle>
        <CardDescription>
          Keep a reachable contact on file. Updates are limited to your organization and audited.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-space-md">
          <div className="grid gap-space-sm sm:grid-cols-2">
            <div className="space-y-space-2xs">
              <Label htmlFor="contact_person">Primary contact</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={initialValues.contact_person ?? ''}
                placeholder="Jordan Smith"
              />
            </div>
            <div className="space-y-space-2xs">
              <Label htmlFor="contact_title">Title / role</Label>
              <Input
                id="contact_title"
                name="contact_title"
                defaultValue={initialValues.contact_title ?? ''}
                placeholder="Coordinator"
              />
            </div>
          </div>

          <div className="grid gap-space-sm sm:grid-cols-2">
            <div className="space-y-space-2xs">
              <Label htmlFor="contact_email">Contact email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={initialValues.contact_email ?? ''}
                placeholder="team@example.org"
              />
            </div>
            <div className="space-y-space-2xs">
              <Label htmlFor="contact_phone">Contact phone</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                defaultValue={initialValues.contact_phone ?? ''}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-space-2xs">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={initialValues.website ?? ''}
              placeholder="https://example.org"
            />
          </div>

          <div className="flex items-center justify-end gap-space-sm">
            {state.status === 'error' && state.message ? (
              <p className="text-label-sm text-destructive" role="status">
                {state.message}
              </p>
            ) : null}
            <SubmitButton label="Save contact" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function OrgNotesSettingsForm({ initialValues }: { initialValues: NotesValues }) {
  const { toast } = useToast();
  const router = useRouter();
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Notes saved', description: 'Coordination notes updated.' });
      router.refresh();
    } else if (state.status === 'error' && state.message) {
      toast({ title: 'Save failed', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-lg">Coordination notes</CardTitle>
        <CardDescription>Share referral steps or access needs with IHARC staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-space-md">
          <div className="space-y-space-2xs">
            <Label htmlFor="referral_process">Referral process</Label>
            <Textarea
              id="referral_process"
              name="referral_process"
              rows={3}
              defaultValue={initialValues.referral_process ?? ''}
              placeholder="How IHARC should refer clients or book with your team."
            />
          </div>

          <div className="space-y-space-2xs">
            <Label htmlFor="availability_notes">Availability notes</Label>
            <Textarea
              id="availability_notes"
              name="availability_notes"
              rows={3}
              defaultValue={initialValues.availability_notes ?? ''}
              placeholder="Office hours, blackout dates, or holiday closures."
            />
          </div>

          <div className="space-y-space-2xs">
            <Label htmlFor="special_requirements">Special requirements</Label>
            <Textarea
              id="special_requirements"
              name="special_requirements"
              rows={3}
              defaultValue={initialValues.special_requirements ?? ''}
              placeholder="Accessibility, trauma-informed needs, or safety considerations."
            />
          </div>

          <div className="flex items-center justify-end gap-space-sm">
            {state.status === 'error' && state.message ? (
              <p className="text-label-sm text-destructive" role="status">
                {state.message}
              </p>
            ) : null}
            <SubmitButton label="Save notes" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-[140px]">
      {pending ? 'Saving…' : label}
    </Button>
  );
}
