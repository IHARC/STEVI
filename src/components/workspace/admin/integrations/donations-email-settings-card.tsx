'use client';

import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { upsertDonationsEmailCredentialsAction } from '@/app/(ops)/ops/admin/donations/actions';

type Props = {
  emailSettings: Record<string, string | null>;
};

export function DonationsEmailSettingsCard({ emailSettings }: Props) {
  const provider = (emailSettings.donations_email_provider?.trim().toLowerCase() ?? 'sendgrid') as string;
  const isSendgrid = provider === 'sendgrid';
  const configured = Boolean(emailSettings.donations_email_from && isSendgrid && emailSettings.donations_sendgrid_api_key_secret_id);

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Email (donations)</CardTitle>
            <CardDescription>Sender for donation receipts and manage-link emails.</CardDescription>
          </div>
          <Badge variant={configured ? 'secondary' : 'destructive'}>{configured ? 'Configured' : 'Missing'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          action={upsertDonationsEmailCredentialsAction}
          className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4 lg:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="donations-email-from">From address</Label>
            <Input
              id="donations-email-from"
              name="email_from"
              type="email"
              autoComplete="off"
              defaultValue={emailSettings.donations_email_from ?? ''}
              placeholder="IHARC Donations <donations@iharc.ca>"
              required
            />
            <p className="text-xs text-muted-foreground">Provider: {isSendgrid ? 'SendGrid' : provider}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donations-sendgrid-key">SendGrid API key</Label>
            <Input id="donations-sendgrid-key" name="sendgrid_api_key" type="password" autoComplete="off" placeholder="SG.…" required />
            <p className="text-xs text-muted-foreground">Current secret id: {emailSettings.donations_sendgrid_api_key_secret_id ?? '—'}</p>
          </div>

          <div className="lg:col-span-2">
            <Button type="submit" className="w-full">
              Save email settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

