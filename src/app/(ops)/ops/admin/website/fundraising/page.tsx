import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { EmptyState } from '@shared/ui/empty-state';

export const dynamic = 'force-dynamic';

export default function AdminWebsiteFundraisingPage() {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Fundraising (Stripe)</CardTitle>
        <CardDescription>Campaigns, receipts, and donor workflows.</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Fundraising admin not wired yet"
          description="Add Stripe configuration, campaign models, and webhook-backed audit trails before accepting payments."
        />
      </CardContent>
    </Card>
  );
}

