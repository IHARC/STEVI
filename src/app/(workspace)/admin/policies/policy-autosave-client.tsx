'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@shared/ui/use-toast';
import { autosavePolicyAction } from './actions';

type Props = {
  policyId: string | null;
  intervalMs?: number;
};

export function PolicyAutosaveClient({ policyId, intervalMs = 8000 }: Props) {
  const { toast } = useToast();
  const lastBody = useRef<string>('');
  const lastSummary = useRef<string>('');
  const saving = useRef(false);

  useEffect(() => {
    if (!policyId) return undefined;
    const handle = setInterval(async () => {
      if (saving.current) return;
      const body = (document.querySelector('input[name="body_html"], textarea[name="body_html"]') as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
      const summary = (document.querySelector('textarea[name="short_summary"]') as HTMLTextAreaElement | null)?.value ?? '';
      if (body === lastBody.current && summary === lastSummary.current) return;
      saving.current = true;
      lastBody.current = body;
      lastSummary.current = summary;
      const formData = new FormData();
      formData.append('policy_id', policyId);
      formData.append('body_html', body);
      formData.append('short_summary', summary);
      const result = await autosavePolicyAction(formData);
      saving.current = false;
      if (!result.success) return;
      toast({ title: 'Draft saved', description: 'Policy autosaved.' });
    }, intervalMs);
    return () => clearInterval(handle);
  }, [policyId, intervalMs, toast]);

  return null;
}
