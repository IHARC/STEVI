'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@shared/ui/use-toast';
import { updateResourceDraftAction } from './actions';

type Props = {
  resourceId: string | null;
  intervalMs?: number;
};

export function ResourceAutosaveClient({ resourceId, intervalMs = 8000 }: Props) {
  const { toast } = useToast();
  const lastBody = useRef<string>('');
  const lastSummary = useRef<string>('');
  const saving = useRef(false);

  useEffect(() => {
    if (!resourceId) return undefined;
    const handle = setInterval(async () => {
      if (saving.current) return;
      const body = (document.querySelector('input[name="body_html"], textarea[name="body_html"]') as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
      const summary = (document.querySelector('textarea[name="summary"]') as HTMLTextAreaElement | null)?.value ?? '';
      if (body === lastBody.current && summary === lastSummary.current) return;
      saving.current = true;
      lastBody.current = body;
      lastSummary.current = summary;
      const formData = new FormData();
      formData.append('resource_id', resourceId);
      formData.append('body_html', body);
      formData.append('summary', summary);
      const result = await updateResourceDraftAction(formData);
      saving.current = false;
      if (!result.success) {
        return;
      }
      toast({ title: 'Draft saved', description: 'Resource autosaved.' });
    }, intervalMs);
    return () => clearInterval(handle);
  }, [resourceId, intervalMs, toast]);

  return null;
}
