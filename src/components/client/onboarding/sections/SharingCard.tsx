'use client';

import { useEffect, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { FormSubmit } from './FormSubmit';
import type { OnboardingActionState } from '@/app/(client)/onboarding/actions';
import type { OnboardingActor } from '@/lib/onboarding/utils';
import { sharingSchema, type SharingFormValues } from '../schemas';

export type SharingCardProps = {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  dataSharingConsent: boolean | null;
  actor: OnboardingActor;
  disabled?: boolean;
};

export function SharingCard({ onSubmit, state, personId, dataSharingConsent, actor, disabled }: SharingCardProps) {
  const partnerBlocked = actor === 'partner';
  const form = useForm<SharingFormValues>({
    resolver: zodResolver(sharingSchema),
    defaultValues: {
      person_id: personId ? String(personId) : '',
      data_sharing: dataSharingConsent === true ? 'partners' : 'iharc_only',
    },
  });

  useEffect(() => {
    form.reset({
      person_id: personId ? String(personId) : '',
      data_sharing: dataSharingConsent === true ? 'partners' : 'iharc_only',
    });
  }, [dataSharingConsent, form, personId]);

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
        <CardTitle className="text-xl">3. Data sharing</CardTitle>
        <CardDescription>Choose who can access your IHARC record.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4" onSubmit={handleValidation}>
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled || partnerBlocked} className="space-y-4">
              {partnerBlocked ? (
                <Alert variant="destructive">
                  <AlertTitle>Partner accounts cannot set sharing</AlertTitle>
                  <AlertDescription>
                    Sharing preferences must be set by the client or IHARC staff. Ask them to complete onboarding.
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="data_sharing"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/40 p-3">
                            <RadioGroupItem value="iharc_only" id="share_iharc_only" className="mt-1" />
                            <div className="space-y-0.5">
                              <FormLabel htmlFor="share_iharc_only">Share only with IHARC team</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Only IHARC staff assigned to your case can view your record.
                              </p>
                            </div>
                          </label>
                          <label className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/40 p-3">
                            <RadioGroupItem value="partners" id="share_partners" className="mt-1" />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <FormLabel htmlFor="share_partners">Share with IHARC partners</FormLabel>
                                <Badge variant="outline">Faster referrals</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                IHARC partner agencies involved in your care can view your record to speed up coordination.
                              </p>
                            </div>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to save preference</AlertTitle>
                <AlertDescription>{state.message ?? 'Try again in a moment.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Sharing preference saved</AlertTitle>
                <AlertDescription>Your choice is recorded.</AlertDescription>
              </Alert>
            ) : null}

            <FormSubmit disabled={disabled || partnerBlocked} pendingLabel="Saving…">
              Save preference
            </FormSubmit>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
