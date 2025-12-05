'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
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
  const [state, formAction] = useFormState(submitFooter, initialState);
  const { toast } = useToast();

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
    <form action={formAction} className="space-y-4" aria-live="polite">
      <div className="space-y-1">
        <Label htmlFor="primary_text">Primary line</Label>
        <Input
          id="primary_text"
          name="primary_text"
          defaultValue={primaryText}
          maxLength={220}
          required
          className="font-medium"
          aria-invalid={hasError}
          aria-describedby={hasError ? 'footer-error' : undefined}
        />
        <p className="text-xs text-muted-foreground">Rendered after the © year on the marketing site.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="secondary_text">Secondary line</Label>
        <Textarea
          id="secondary_text"
          name="secondary_text"
          defaultValue={secondaryText}
          maxLength={300}
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'footer-error' : undefined}
        />
        <p className="text-xs text-muted-foreground">Optional supporting statement beneath the primary line. Leave blank to hide it.</p>
      </div>

      {hasError ? (
        <p id="footer-error" className="text-sm text-error">
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
  );
}
