'use client';

import { useActionState } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { choiceCardVariants } from '@shared/ui/choice-card';
import { FormSection } from '@shared/ui/form-section';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';

export type ConcernReportState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
  trackingCode?: string | null;
};

export const CONCERN_REPORT_INITIAL_STATE: ConcernReportState = {
  status: 'idle',
};

type ContactPreference = 'anonymous' | 'email' | 'phone';

type ConcernReportValues = {
  category: string;
  description: string;
  location: string;
  contact_preference: ContactPreference;
  contact_email: string;
  contact_phone: string;
  additional_details: string;
};

type ConcernReportFormProps = {
  action: (state: ConcernReportState, formData: FormData) => Promise<ConcernReportState>;
  initialState?: ConcernReportState;
};

export function ConcernReportForm({
  action,
  initialState = CONCERN_REPORT_INITIAL_STATE,
}: ConcernReportFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<ConcernReportValues>({
    defaultValues: {
      category: 'community_impact',
      description: '',
      location: '',
      contact_preference: 'anonymous',
      contact_email: '',
      contact_phone: '',
      additional_details: '',
    },
  });

  const contactPreference = form.watch('contact_preference');
  const isSuccess = state.status === 'success';
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const isValid = await form.trigger();
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
        onSubmit={handleSubmit}
      >
        <section className="space-y-3">
          <header>
            <p className="text-xs uppercase text-muted-foreground">Community concern</p>
            <h1 className="text-xl font-medium text-foreground">Report a concern or share feedback</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We review every submission within two business days. If someone is in immediate danger, call 911. For
              non-emergency social and health navigation, contact{' '}
              <a
                className="underline hover:text-primary"
                href="https://211ontario.ca"
                target="_blank"
                rel="noreferrer"
              >
                211 Ontario
              </a>{' '}
              by phone, text, or chat — they offer support 24/7 in 150+ languages.
            </p>
          </header>

          {state.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We couldn’t submit your concern</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {isSuccess && state.message ? (
            <Alert className="border-primary bg-primary/10 text-sm text-primary">
              <AlertTitle>Thanks for reaching out</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{state.message}</p>
                {state.trackingCode ? (
                  <p className="font-mono text-xs">
                    Tracking code: <strong>{state.trackingCode}</strong>. Share this code if you contact us for an update.
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </section>

        <section className="space-y-4">
          <FormField
            control={form.control}
            name="category"
            rules={{ required: 'Choose a category' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="category">What type of concern is this? *</FormLabel>
                <input type="hidden" name="category" value={field.value} />
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="community_impact">Community impact near IHARC sites</SelectItem>
                      <SelectItem value="service_feedback">Service feedback or kudos</SelectItem>
                      <SelectItem value="safety_hazard">Safety hazard or needle clean-up</SelectItem>
                      <SelectItem value="discrimination">Discrimination or harassment</SelectItem>
                      <SelectItem value="encampment_support">Encampment or welfare check request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            rules={{ required: 'Tell us what happened' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="description">What happened? *</FormLabel>
                <FormControl>
                  <Textarea
                    id="description"
                    rows={5}
                    required
                    placeholder="Share what you witnessed, when it happened, and who was involved (if known)."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            rules={{ required: 'Location is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="location">Where did this happen? *</FormLabel>
                <FormControl>
                  <Input
                    id="location"
                    required
                    maxLength={200}
                    placeholder="Cross-streets, landmarks, shelter/hotel name, etc."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_preference"
            render={({ field }) => (
              <FormSection asChild>
                <FormItem className="space-y-3">
                <FormLabel className="text-sm font-medium text-foreground">How should we follow up?</FormLabel>
                <input type="hidden" name="contact_preference" value={field.value} />
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as ContactPreference)}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    <ContactOption
                      value="anonymous"
                      title="Anonymous"
                      description="Get a tracking code only. Provide this if you contact us later."
                    />
                    <ContactOption
                      value="email"
                      title="Email"
                      description="Receive updates and clarification questions by email."
                    />
                    <ContactOption
                      value="phone"
                      title="Phone"
                      description="We’ll text or call if it’s safe. Leave details below."
                    />
                  </RadioGroup>
                </FormControl>

                {contactPreference === 'email' ? (
                  <FormField
                    control={form.control}
                    name="contact_email"
                    rules={{ required: 'Email is required for follow up' }}
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel htmlFor="contact_email">Email address *</FormLabel>
                        <FormControl>
                          <Input id="contact_email" type="email" autoComplete="email" required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {contactPreference === 'phone' ? (
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    rules={{ required: 'Phone number is required for follow up' }}
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel htmlFor="contact_phone">Phone number *</FormLabel>
                        <FormControl>
                          <Input
                            id="contact_phone"
                            type="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            required
                            placeholder="+16475551234"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                </FormItem>
              </FormSection>
            )}
          />

          <FormField
            control={form.control}
            name="additional_details"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="additional_details">Anything else we should know?</FormLabel>
                <FormControl>
                  <Textarea
                    id="additional_details"
                    rows={3}
                    placeholder="Safety notes, people involved, or supports already in place."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">We log every submission and keep sensitive details private.</p>
          <SubmitButton isSuccess={isSuccess} />
        </div>
      </form>
    </Form>
  );
}

function ContactOption({
  value,
  title,
  description,
}: {
  value: ContactPreference;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={`contact_preference_${value}`}
      className={choiceCardVariants({ padding: 'md' })}
    >
      <RadioGroupItem id={`contact_preference_${value}`} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[150px] justify-center">
      {pending ? 'Submitting...' : isSuccess ? 'Submitted' : 'Submit concern'}
    </Button>
  );
}
