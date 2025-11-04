'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

type ConcernReportFormProps = {
  action: (state: ConcernReportState, formData: FormData) => Promise<ConcernReportState>;
  initialState?: ConcernReportState;
};

export function ConcernReportForm({ action, initialState = CONCERN_REPORT_INITIAL_STATE }: ConcernReportFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [contactPreference, setContactPreference] = useState<ContactPreference>('anonymous');
  const isSuccess = state.status === 'success';

  return (
    <form
      action={formAction}
      className="space-y-space-lg rounded-[var(--md-sys-shape-corner-extra-large)] border border-outline/40 bg-surface p-space-lg shadow-level-1 sm:p-space-xl"
      noValidate
    >
      <section className="space-y-space-sm">
        <header>
          <p className="text-label-sm uppercase tracking-[0.12em] text-outline">Community concern</p>
          <h1 className="text-title-lg font-medium text-on-surface">Report a concern or share feedback</h1>
          <p className="mt-space-xs text-body-sm text-muted">
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
          <Alert variant="destructive" className="text-body-sm">
            <AlertTitle>We couldn’t submit your concern</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {isSuccess && state.message ? (
          <Alert className="border-primary/30 bg-primary/10 text-body-sm text-on-primary-container">
            <AlertTitle>Thanks for reaching out</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{state.message}</p>
              {state.trackingCode ? (
                <p className="font-mono text-label-md">
                  Tracking code: <strong>{state.trackingCode}</strong>. Share this code if you contact us for an update.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-space-md">
        <div className="grid gap-space-xs">
          <Label htmlFor="category">What type of concern is this? *</Label>
          <Select name="category" defaultValue="community_impact" required>
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
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="description">What happened? *</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            required
            placeholder="Share what you witnessed, when it happened, and who was involved (if known)."
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="location">Where did this happen? *</Label>
          <Input
            id="location"
            name="location"
            required
            maxLength={200}
            placeholder="Cross-streets, landmarks, shelter/hotel name, etc."
          />
        </div>

        <fieldset className="space-y-space-sm rounded-[var(--md-sys-shape-corner-medium)] border border-outline/30 p-space-md">
          <legend className="text-body-sm font-medium text-on-surface">How should we follow up?</legend>
          <RadioGroup
            value={contactPreference}
            onValueChange={(value) => setContactPreference(value as ContactPreference)}
            className="grid gap-space-sm md:grid-cols-3"
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

          {contactPreference === 'email' ? (
            <div className="grid gap-space-xs">
              <Label htmlFor="contact_email">Email address *</Label>
              <Input id="contact_email" name="contact_email" type="email" autoComplete="email" required />
            </div>
          ) : null}

          {contactPreference === 'phone' ? (
            <div className="grid gap-space-xs">
              <Label htmlFor="contact_phone">Phone number *</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="+16475551234"
              />
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-space-xs">
          <Label htmlFor="additional_details">Anything else we should know?</Label>
          <Textarea
            id="additional_details"
            name="additional_details"
            rows={3}
            placeholder="Safety notes, people involved, or supports already in place."
          />
        </div>

        <input type="hidden" name="contact_preference" value={contactPreference} />
      </section>

      <div className="flex items-center justify-between gap-space-md">
        <p className="text-label-sm text-muted">We log every submission and keep sensitive details private.</p>
        <SubmitButton isSuccess={isSuccess} />
      </div>
    </form>
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
      className="flex cursor-pointer items-start gap-space-sm rounded-[var(--md-sys-shape-corner-medium)] border border-outline/40 bg-surface-container p-space-md text-left text-body-sm font-medium text-on-surface shadow-level-1 transition hover:border-primary/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    >
      <RadioGroupItem id={`contact_preference_${value}`} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-space-2xs block text-label-sm font-normal text-muted">{description}</span>
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
