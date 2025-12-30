'use client';

import { useFormState } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { EmptyState } from '@shared/ui/empty-state';
import {
  deleteCfsAttachmentAction,
  uploadCfsAttachmentAction,
  initialCfsAttachmentActionState,
} from '@/app/(ops)/ops/cfs/actions';

export type CfsAttachmentItem = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  signedUrl: string | null;
};

type CfsAttachmentsCardProps = {
  cfsId: number;
  attachments: CfsAttachmentItem[];
  canUpload: boolean;
  canDelete: boolean;
};

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export function CfsAttachmentsCard({ cfsId, attachments, canUpload, canDelete }: CfsAttachmentsCardProps) {
  const [state, formAction] = useFormState(uploadCfsAttachmentAction, initialCfsAttachmentActionState);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-xl">Attachments</CardTitle>
        <CardDescription>Upload photos or documents tied to this call for service.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === 'error' ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to upload</AlertTitle>
            <AlertDescription>{state.message ?? 'Please try again.'}</AlertDescription>
          </Alert>
        ) : null}

        {state.status === 'success' ? (
          <Alert>
            <AlertTitle>Attachment uploaded</AlertTitle>
            <AlertDescription>{state.message ?? 'The attachment is now available.'}</AlertDescription>
          </Alert>
        ) : null}

        {attachments.length === 0 ? (
          <EmptyState title="No attachments yet" description="Upload photos or files that help teams respond." />
        ) : (
          <div className="space-y-3">
            {attachments.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{item.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.file_size)} · {formatTimestamp(item.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.file_type ? <span>{item.file_type}</span> : null}
                    {item.signedUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={item.signedUrl} target="_blank" rel="noreferrer">
                          Download
                        </a>
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <form action={deleteCfsAttachmentAction}>
                        <input type="hidden" name="cfs_id" value={cfsId} />
                        <input type="hidden" name="attachment_id" value={item.id} />
                        <Button size="sm" variant="destructive" type="submit">
                          Delete
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {canUpload ? (
          <form action={formAction} className="space-y-3" encType="multipart/form-data">
            <input type="hidden" name="cfs_id" value={cfsId} />
            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment file</Label>
              <Input id="attachment" name="attachment" type="file" required />
              <p className="text-xs text-muted-foreground">Maximum size: 15 MB. Photos, PDFs, and docs are supported.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment_notes">Notes (optional)</Label>
              <Textarea id="attachment_notes" name="attachment_notes" placeholder="Add context for the file." />
            </div>
            <Button type="submit">Upload attachment</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
