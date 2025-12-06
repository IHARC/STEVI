'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export type CommunityRegistrationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const COMMUNITY_REGISTRATION_INITIAL_STATE: CommunityRegistrationState = {
  status: 'idle',
};

type CommunityRegistrationValues = {
  next: string;
  display_name: string;
  email: string;
  password: string;
  password_confirm: string;
  consent_privacy: boolean;
  consent_terms: boolean;
  consent_updates: boolean;
};

type CommunityRegistrationFormProps = {
  action: (state: CommunityRegistrationState, formData: FormData) => Promise<CommunityRegistrationState>;
  initialState?: CommunityRegistrationState;
  nextPath: string;
};

export function CommunityRegistrationForm({
  action,
  initialState = COMMUNITY_REGISTRATION_INITIAL_STATE,
  nextPath,
}: CommunityRegistrationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<CommunityRegistrationValues>({
    defaultValues: {
      next: nextPath,
      display_name: '',
      email: '',
      password: '',
      password_confirm: '',
      consent_privacy: false,
      consent_terms: false,
      consent_updates: true,
    },
  });
  const isSuccess = state.status === 'success';

  return (
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
      >
        <input type="hidden" {...form.register('next')} />

        <section className="space-y-3">
          <header>
            <p className="text-xs uppercase text-muted-foreground">Neighbour updates</p>
            <h1 className="text-xl font-medium text-foreground">Join as a community member</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Get email updates about IHARC programs, submit feedback, and follow progress on local initiatives.
            </p>
          </header>

          {state.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We couldn’t create your account</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {isSuccess && state.message ? (
            <Alert className="border-primary bg-primary/10 text-sm text-primary">
              <AlertTitle>Welcome to the IHARC community</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
        </section>

        <section className="space-y-4">
          <FormField
            control={form.control}
            name="display_name"
            rules={{ required: 'Display name is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="display_name">Display name *</FormLabel>
                <FormControl>
                  <Input
                    id="display_name"
                    required
                    maxLength={80}
                    placeholder="Name other neighbours will see"
                    autoComplete="nickname"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            rules={{ required: 'Email is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="email">Email address *</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.ca"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  We’ll send a confirmation email. You can manage notification preferences after signing in.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="password">Create a password *</FormLabel>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    placeholder="At least 12 characters"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password_confirm"
            rules={{ required: 'Confirm password' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="password_confirm">Confirm password *</FormLabel>
                <FormControl>
                  <Input
                    id="password_confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    placeholder="Re-enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 rounded-xl border border-border/30 p-4">
            <FormField
              control={form.control}
              name="consent_privacy"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_privacy_community"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_privacy_community" className="font-normal">
                    I understand why IHARC collects my information and how it’s used. <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consent_terms"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_terms" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_terms_community"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_terms_community" className="font-normal">
                    I agree to the portal Terms and Privacy Policy. <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consent_updates"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_updates" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_updates"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_updates" className="font-normal">
                    Email me community updates, surveys, and program invitations.
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">You can unsubscribe from emails or delete your profile at any time.</p>
          <SubmitButton isSuccess={isSuccess} />
        </div>
      </form>
    </Form>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[140px] justify-center">
      {pending ? 'Creating...' : isSuccess ? 'Account created' : 'Create account'}
    </Button>
  );
}
