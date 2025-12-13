'use client';

import { useEffect, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import type { OnboardingActionState } from '@/app/(client)/onboarding/actions';
import type { OnboardingPrefill } from '../types';
import { basicInfoSchema, buildBasicInfoDefaults, type BasicInfoFormValues } from '../schemas';
import { FormSubmit } from './FormSubmit';

export type BasicInfoCardProps = {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  prefill: OnboardingPrefill;
  disabled?: boolean;
};

export function BasicInfoCard({ onSubmit, state, personId, prefill, disabled }: BasicInfoCardProps) {
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: buildBasicInfoDefaults(prefill, personId),
  });

  useEffect(() => {
    form.reset(buildBasicInfoDefaults(prefill, personId));
  }, [form, personId, prefill]);

  const handleValidation = async (event: FormEvent<HTMLFormElement>) => {
    const valid = await form.trigger();
    if (!valid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">1. Basic info</CardTitle>
        <CardDescription>Choose the name we should use and how to reach you safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4" onSubmit={handleValidation}>
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="chosen_name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="chosen_name">Name to use *</FormLabel>
                      <FormControl>
                        <Input id="chosen_name" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="legal_name">Legal name (optional)</FormLabel>
                      <FormControl>
                        <Input id="legal_name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pronouns"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="pronouns">Pronouns</FormLabel>
                      <FormControl>
                        <Input id="pronouns" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="postal_code">Postal code (optional)</FormLabel>
                      <FormControl>
                        <Input id="postal_code" autoComplete="postal-code" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_email">Email</FormLabel>
                      <FormControl>
                        <Input id="contact_email" type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_phone">Phone</FormLabel>
                      <FormControl>
                        <Input id="contact_phone" type="tel" inputMode="tel" autoComplete="tel" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="preferred_contact_method"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="preferred_contact_method">Preferred contact</FormLabel>
                      <input type="hidden" name="preferred_contact_method" value={field.value} />
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="preferred_contact_method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="both">Email or phone</SelectItem>
                            <SelectItem value="none">Do not contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_window"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_window">Safe contact window (optional)</FormLabel>
                      <FormControl>
                        <Input id="contact_window" placeholder="Evenings, weekdays, etc." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dob_month"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="dob_month">Birth month</FormLabel>
                      <FormControl>
                        <Input id="dob_month" type="number" min={1} max={12} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob_year"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="dob_year">Birth year</FormLabel>
                      <FormControl>
                        <Input id="dob_year" type="number" min={1900} max={new Date().getFullYear()} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-foreground">Safe contact channels</p>
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="safe_call"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_call" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_call"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_call" className="text-sm font-normal">
                          Voice calls are okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safe_text"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_text" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_text"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_text" className="text-sm font-normal">
                          Text messages are okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safe_voicemail"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_voicemail" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_voicemail"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_voicemail" className="text-sm font-normal">
                          Voicemail is okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </fieldset>

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>We couldn’t save your details</AlertTitle>
                <AlertDescription>{state.message ?? 'Unable to save right now.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>Continue with consents next.</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <FormSubmit pendingLabel="Saving…" disabled={disabled}>
                {personId ? 'Save changes' : 'Save and create record'}
              </FormSubmit>
              <Button type="button" variant="ghost" onClick={() => form.reset(buildBasicInfoDefaults(prefill, personId))} disabled={disabled}>
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
