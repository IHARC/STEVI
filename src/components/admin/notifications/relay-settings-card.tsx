'use client';

import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { upsertRelayAction } from '@/app/(portal)/admin/notifications/actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Saving…' : 'Save relay'}
    </Button>
  );
}

type RelayFormProps = {
  channel: 'email' | 'sms';
};

function RelayForm({ channel }: RelayFormProps) {
  return (
    <form
      action={upsertRelayAction as unknown as (formData: FormData) => Promise<void>}
      className="space-y-space-sm"
      aria-label={`${channel} relay form`}
    >
      <input type="hidden" name="channel" value={channel} />
      <div className="grid gap-space-sm sm:grid-cols-2">
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor={`${channel}-provider`}>
            Provider name
          </label>
          <Input id={`${channel}-provider`} name="provider" placeholder="e.g., SendGrid, Twilio" required />
        </div>
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor={`${channel}-api-url`}>
            API base URL (optional)
          </label>
          <Input id={`${channel}-api-url`} name="api_url" placeholder="https://api.example.com" />
        </div>
      </div>
      <div className="grid gap-space-sm sm:grid-cols-2">
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor={`${channel}-api-key`}>
            API key / token
          </label>
          <Input
            id={`${channel}-api-key`}
            name="api_key"
            type="password"
            placeholder="Never shared with clients"
            required
          />
        </div>
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor={`${channel}-active`}>
            Relay status
          </label>
          <Select name="is_active" defaultValue="true">
            <SelectTrigger id={`${channel}-active`}>
              <SelectValue placeholder="Active?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {channel === 'email' ? (
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor="from-email">
            From email (envelope)
          </label>
          <Input id="from-email" name="from_email" type="email" placeholder="notifications@iharc.ca" />
        </div>
      ) : (
        <div className="space-y-space-2xs">
          <label className="text-label-sm font-semibold text-on-surface" htmlFor="from-phone">
            From phone / sender ID
          </label>
          <Input id="from-phone" name="from_phone" placeholder="+1647xxxxxxx" />
        </div>
      )}

      <SaveButton />
    </form>
  );
}

export function RelaySettingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-lg">Delivery relays</CardTitle>
        <p className="text-body-sm text-muted-foreground">
          Configure email/SMS gateways for reminders. Keys stay server-side and are restricted to IHARC and portal admins.
        </p>
      </CardHeader>
      <CardContent className="space-y-space-md">
        <RelayForm channel="email" />
        <div className="border-t border-outline/20" />
        <RelayForm channel="sms" />
      </CardContent>
    </Card>
  );
}
