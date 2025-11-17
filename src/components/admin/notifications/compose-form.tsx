'use client';

import { FormEvent, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { sendNotificationAction } from '@/app/(portal)/admin/notifications/actions';
import type { NotificationRecipient } from './types';

type ComposeNotificationFormProps = {
  actorProfileId: string;
  recipients: NotificationRecipient[];
};

const NOTIFICATION_TYPES = [
  { value: 'general', label: 'General update' },
  { value: 'appointment', label: 'Appointment reminder' },
  { value: 'alert', label: 'Urgent alert' },
  { value: 'case_note', label: 'Case note / follow-up' },
];

export function ComposeNotificationForm({ actorProfileId, recipients }: ComposeNotificationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [emailValue, setEmailValue] = useState('');
  const [isPending, startTransition] = useTransition();

  const recipientLookup = useMemo(() => {
    return new Map(recipients.map((recipient) => [recipient.id, recipient]));
  }, [recipients]);

  const handleRecipientChange = (value: string) => {
    setSelectedRecipient(value);
    if (value) {
      const recipient = recipientLookup.get(value);
      setEmailValue(recipient?.email ?? '');
    } else {
      setEmailValue('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set('actor_profile_id', actorProfileId);

    const result = await sendNotificationAction(formData);
    if (!result.success) {
      toast({ title: 'Notification error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Notification queued', description: 'Delivery will start shortly.' });
    formRef.current?.reset();
    setSelectedRecipient('');
    setEmailValue('');
    startTransition(() => router.refresh());
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-title-lg">Compose notification</CardTitle>
        <CardDescription>
          Send trauma-informed updates. Messages respect notification consent stored with each profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-space-md">
          <input type="hidden" name="recipient_profile_id" value={selectedRecipient} />
          <div className="grid gap-space-sm md:grid-cols-2">
            <Label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase text-muted-foreground">
                Recipient
              </span>
              <select
                value={selectedRecipient}
                onChange={(event) => handleRecipientChange(event.target.value)}
                className="rounded-lg border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isPending}
              >
                <option value="">Select profile</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.displayName}
                    {recipient.organizationName ? ` • ${recipient.organizationName}` : ''}
                  </option>
                ))}
              </select>
            </Label>
            <Label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase text-muted-foreground">
                Notification type
              </span>
              <select
                name="notification_type"
                defaultValue="general"
                className="rounded-lg border border-outline/40 bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isPending}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Label>
          </div>

          <div className="grid gap-space-sm md:grid-cols-2">
            <Label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase text-muted-foreground">
                Recipient email override
              </span>
              <Input
                name="recipient_email"
                type="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                placeholder="client@example.ca"
                disabled={isPending}
              />
            </Label>
            <Label className="grid gap-1 text-body-sm text-on-surface">
              <span className="text-label-sm uppercase text-muted-foreground">
                Payload (JSON, optional)
              </span>
              <Textarea
                name="payload_json"
                placeholder='{"appointmentId":"123"}'
                className="min-h-[72px]"
                disabled={isPending}
              />
            </Label>
          </div>

          <Label className="grid gap-1 text-body-sm text-on-surface">
            <span className="text-label-sm uppercase text-muted-foreground">Subject</span>
            <Input name="subject" placeholder="Reminder: upcoming appointment" required disabled={isPending} />
          </Label>

          <Label className="grid gap-1 text-body-sm text-on-surface">
            <span className="text-label-sm uppercase text-muted-foreground">
              Plain text body
            </span>
            <Textarea
              name="body_text"
              required
              placeholder="Hi Jordan, this is a reminder for tomorrow’s appointment..."
              className="min-h-[140px]"
              disabled={isPending}
            />
          </Label>

          <Label className="grid gap-1 text-body-sm text-on-surface">
            <span className="text-label-sm uppercase text-muted-foreground">
              HTML body (optional)
            </span>
            <Textarea
              name="body_html"
              placeholder="<p>Hi Jordan,</p><p>See you tomorrow...</p>"
              className="min-h-[140px]"
              disabled={isPending}
            />
          </Label>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              Queue notification
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
