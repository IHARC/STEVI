'use client';

import { useEffect, useActionState } from 'react';

import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import { updateSiteFooterAction, type UpdateSiteFooterResult } from '../marketing/footer/actions';

type FooterFormState = UpdateSiteFooterResult | { status: 'idle' };

type FooterFormProps = {
  primaryText: string;
  secondaryText: string;
  lastUpdatedLabel: string | null;
};

const initialState: FooterFormState = { status: 'idle' };

async function submitFooter(prevState: FooterFormState, formData: FormData): Promise<FooterFormState> {
  const result = await updateSiteFooterAction(formData);
  return result ?? { status: 'error', message: 'Unable to update footer.' };
}

export function WebsiteFooterForm({ primaryText, secondaryText, lastUpdatedLabel }: FooterFormProps) {
  const [state, formAction] = useActionState(submitFooter, initialState);
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      primary_text: primaryText,
      secondary_text: secondaryText,
    },
  });

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Saved', description: state.message ?? 'Footer updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Footer not saved', description: state.message ?? 'Try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const hasError = state.status === 'error' && Boolean(state.message);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-4" aria-live="polite">
        <FormField
          control={form.control}
          name="primary_text"
          rules={{ required: 'Primary line is required' }}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel htmlFor="primary_text">Primary line</FormLabel>
              <FormControl>
                <Input
                  id="primary_text"
                  maxLength={220}
                  required
                  className="font-medium"
                  aria-invalid={hasError}
                  aria-describedby={hasError ? 'footer-error' : undefined}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Rendered after the © year on the marketing site.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="secondary_text"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel htmlFor="secondary_text">Secondary line</FormLabel>
              <FormControl>
                <Textarea
                  id="secondary_text"
                  maxLength={300}
                  spellCheck={false}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? 'footer-error' : undefined}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Optional supporting statement beneath the primary line. Leave blank to hide it.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasError ? (
          <p id="footer-error" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save</Button>
          <Button type="reset" variant="ghost">
            Cancel
          </Button>
          {lastUpdatedLabel ? (
            <span className="text-sm text-muted-foreground">Last updated {lastUpdatedLabel}</span>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
