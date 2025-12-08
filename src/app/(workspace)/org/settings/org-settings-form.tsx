'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { useToast } from '@shared/ui/use-toast';
import { updateOrgSettingsAction, type OrgSettingsFormState } from './actions';

const initialState: OrgSettingsFormState = { status: 'idle' };

type ContactValues = {
  contact_person: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  website: string;
};

type NotesValues = {
  referral_process: string;
  special_requirements: string;
  availability_notes: string;
};

export function OrgContactSettingsForm({ initialValues }: { initialValues: ContactValues }) {
  const { toast } = useToast();
  const router = useRouter();
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);
  const form = useForm<ContactValues>({
    defaultValues: {
      contact_person: initialValues.contact_person ?? '',
      contact_title: initialValues.contact_title ?? '',
      contact_email: initialValues.contact_email ?? '',
      contact_phone: initialValues.contact_phone ?? '',
      website: initialValues.website ?? '',
    },
  });

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
        <CardTitle className="text-xl">Contact & visibility</CardTitle>
        <CardDescription>
          Keep a reachable contact on file. Updates are limited to your organization and audited.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="contact_person">Primary contact</FormLabel>
                    <FormControl>
                      <Input id="contact_person" placeholder="Jordan Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_title"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="contact_title">Title / role</FormLabel>
                    <FormControl>
                      <Input id="contact_title" placeholder="Coordinator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="contact_email">Contact email</FormLabel>
                    <FormControl>
                      <Input id="contact_email" type="email" placeholder="team@example.org" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="contact_phone">Contact phone</FormLabel>
                    <FormControl>
                      <Input id="contact_phone" placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="website">Website</FormLabel>
                  <FormControl>
                    <Input id="website" type="url" placeholder="https://example.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3">
              {state.status === 'error' && state.message ? (
                <p className="text-xs text-destructive" role="status">
                  {state.message}
                </p>
              ) : null}
              <SubmitButton label="Save contact" />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function OrgNotesSettingsForm({ initialValues }: { initialValues: NotesValues }) {
  const { toast } = useToast();
  const router = useRouter();
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);
  const form = useForm<NotesValues>({
    defaultValues: {
      referral_process: initialValues.referral_process ?? '',
      special_requirements: initialValues.special_requirements ?? '',
      availability_notes: initialValues.availability_notes ?? '',
    },
  });

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
        <CardTitle className="text-xl">Coordination notes</CardTitle>
        <CardDescription>Share referral steps or access needs with IHARC staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <FormField
              control={form.control}
              name="referral_process"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="referral_process">Referral process</FormLabel>
                  <FormControl>
                    <Textarea
                      id="referral_process"
                      rows={3}
                      placeholder="How IHARC should refer clients or book with your team."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability_notes"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="availability_notes">Availability notes</FormLabel>
                  <FormControl>
                    <Textarea
                      id="availability_notes"
                      rows={3}
                      placeholder="Office hours, blackout dates, or holiday closures."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="special_requirements"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="special_requirements">Special requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      id="special_requirements"
                      rows={3}
                      placeholder="Accessibility, trauma-informed needs, or safety considerations."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3">
              {state.status === 'error' && state.message ? (
                <p className="text-xs text-destructive" role="status">
                  {state.message}
                </p>
              ) : null}
              <SubmitButton label="Save notes" />
            </div>
          </form>
        </Form>
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
