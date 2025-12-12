'use client';

import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Button } from '@shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { upsertRelayAction } from '@/app/(ops)/ops/admin/notifications/actions';

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
      className="space-y-3"
      aria-label={`${channel} relay form`}
    >
      <input type="hidden" name="channel" value={channel} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor={`${channel}-provider`}>
            Provider name
          </label>
          <Input id={`${channel}-provider`} name="provider" placeholder="e.g., SendGrid, Twilio" required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor={`${channel}-api-url`}>
            API base URL (optional)
          </label>
          <Input id={`${channel}-api-url`} name="api_url" placeholder="https://api.example.com" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor={`${channel}-api-key`}>
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
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor={`${channel}-active`}>
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
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="from-email">
            From email (envelope)
          </label>
          <Input id="from-email" name="from_email" type="email" placeholder="notifications@iharc.ca" />
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="from-phone">
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
        <CardTitle className="text-xl">Delivery relays</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure email/SMS gateways for reminders. Keys stay server-side and are restricted to IHARC and portal admins.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RelayForm channel="email" />
        <div className="border-t border-border/40" />
        <RelayForm channel="sms" />
      </CardContent>
    </Card>
  );
}
