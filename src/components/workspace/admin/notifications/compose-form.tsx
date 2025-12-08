'use client';

import { FormEvent, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Checkbox } from '@shared/ui/checkbox';
import { useToast } from '@shared/ui/use-toast';
import { sendNotificationAction } from '@/app/(workspace)/admin/notifications/actions';
import type { NotificationRecipient } from './types';

type ComposeNotificationFormProps = {
  recipients: NotificationRecipient[];
  hasAlertsSecret: boolean;
};

const NOTIFICATION_TYPES = [
  { value: 'general', label: 'General update' },
  { value: 'appointment', label: 'Appointment reminder' },
  { value: 'alert', label: 'Urgent alert' },
  { value: 'case_note', label: 'Case note / follow-up' },
  { value: 'test', label: 'Test message' },
];

const TEMPLATES = [
  {
    id: 'appt-reminder',
    label: 'Appointment reminder',
    type: 'appointment',
    subject: 'Reminder: your upcoming appointment',
    bodyText: 'Hi there, this is a reminder about your upcoming appointment. Reply if you need to reschedule.',
  },
  {
    id: 'case-followup',
    label: 'Case follow-up',
    type: 'case_note',
    subject: 'Checking in on next steps',
    bodyText: 'Hi, following up on our last conversation. Let us know if you need support before the next visit.',
  },
  {
    id: 'general-update',
    label: 'General update',
    type: 'general',
    subject: 'Update from the STEVI team',
    bodyText: 'Hi, we have a quick update to share. Reply here if you have questions.',
  },
  {
    id: 'test-send',
    label: 'Test message',
    type: 'test',
    subject: '[TEST] Notification delivery check',
    bodyText: 'This is a test message to confirm notification delivery from STEVI.',
  },
];

export function ComposeNotificationForm({ recipients, hasAlertsSecret }: ComposeNotificationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [emailValue, setEmailValue] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [notificationType, setNotificationType] = useState<string>('general');
  const [subjectValue, setSubjectValue] = useState('');
  const [bodyTextValue, setBodyTextValue] = useState('');
  const [isTestSend, setIsTestSend] = useState(false);
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

    if (isTestSend && !hasAlertsSecret) {
      toast({ title: 'Test send blocked', description: 'Configure PORTAL_ALERTS_SECRET to send tests.', variant: 'destructive' });
      return;
    }

    formData.append('is_test', String(isTestSend));

    const result = await sendNotificationAction(formData);
    if (!result.success) {
      toast({ title: 'Notification error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: isTestSend ? 'Test queued' : 'Notification queued', description: 'Delivery will start shortly.' });
    formRef.current?.reset();
    setSelectedRecipient('');
    setEmailValue('');
    setTemplateId('');
    setNotificationType('general');
    setSubjectValue('');
    setBodyTextValue('');
    startTransition(() => router.refresh());
  };

  const applyTemplate = (id: string) => {
    const template = TEMPLATES.find((t) => t.id === id);
    setTemplateId(id);
    if (!template) return;
    setNotificationType(template.type);
    setSubjectValue(template.subject);
    setBodyTextValue(template.bodyText);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Compose notification</CardTitle>
      <CardDescription>
        Send trauma-informed updates. Messages respect notification consent stored with each profile.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/15 bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Badge variant={hasAlertsSecret ? 'secondary' : 'destructive'}>
              {hasAlertsSecret ? 'Edge function ready' : 'Configure PORTAL_ALERTS_SECRET for sends'}
            </Badge>
            <Badge variant="outline">Consent enforced server-side</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Label className="grid gap-1 text-sm text-foreground">
              <span className="text-xs uppercase text-muted-foreground">
                Recipient
              </span>
              <Select
                name="recipient_profile_id"
                value={selectedRecipient}
                onValueChange={handleRecipientChange}
                disabled={isPending}
              >
                <SelectTrigger aria-label="Recipient">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select profile</SelectItem>
                  {recipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      {recipient.displayName}
                      {recipient.organizationName ? ` • ${recipient.organizationName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
            <Label className="grid gap-1 text-sm text-foreground">
              <span className="text-xs uppercase text-muted-foreground">
                Notification type
              </span>
              <Select name="notification_type" value={notificationType} onValueChange={setNotificationType} disabled={isPending}>
                <SelectTrigger aria-label="Notification type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Label className="grid gap-1 text-sm text-foreground">
              <span className="text-xs uppercase text-muted-foreground">
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
            <Label className="grid gap-1 text-sm text-foreground">
              <span className="text-xs uppercase text-muted-foreground">
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

          <Label className="grid gap-1 text-sm text-foreground">
            <span className="text-xs uppercase text-muted-foreground">Template</span>
            <Select value={templateId} onValueChange={applyTemplate} disabled={isPending}>
              <SelectTrigger aria-label="Template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No template</SelectItem>
                {TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>

          <Label className="grid gap-1 text-sm text-foreground">
            <span className="text-xs uppercase text-muted-foreground">Subject</span>
            <Input
              name="subject"
              placeholder="Reminder: upcoming appointment"
              required
              disabled={isPending}
              value={subjectValue}
              onChange={(event) => setSubjectValue(event.target.value)}
            />
          </Label>

          <Label className="grid gap-1 text-sm text-foreground">
            <span className="text-xs uppercase text-muted-foreground">
              Plain text body
            </span>
            <Textarea
              name="body_text"
              required
              placeholder="Hi Jordan, this is a reminder for tomorrow’s appointment..."
              className="min-h-[140px]"
              disabled={isPending}
              value={bodyTextValue}
              onChange={(event) => setBodyTextValue(event.target.value)}
            />
          </Label>

          <Label className="grid gap-1 text-sm text-foreground">
            <span className="text-xs uppercase text-muted-foreground">
              HTML body (optional)
            </span>
            <Textarea
              name="body_html"
              placeholder="<p>Hi Jordan,</p><p>See you tomorrow...</p>"
              className="min-h-[140px]"
              disabled={isPending}
            />
          </Label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={isTestSend}
                onCheckedChange={(value) => setIsTestSend(Boolean(value))}
                disabled={isPending}
                aria-label="Toggle test send"
              />
              <span>Test send (uses templates; requires secret)</span>
            </label>
            <Button type="submit" disabled={isPending || (isTestSend && !hasAlertsSecret)}>
              {isTestSend ? 'Send test' : 'Queue notification'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
