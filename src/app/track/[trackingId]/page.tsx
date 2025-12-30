import { notFound } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchPublicTracking } from '@/lib/cfs/queries';
import { formatCfsLabel, PUBLIC_STATUS_TONES } from '@/lib/cfs/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ trackingId: string }>;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export default async function PublicTrackingPage({ params }: PageProps) {
  const resolvedParams = await params;
  const trackingId = resolvedParams.trackingId;

  if (!trackingId) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const tracking = await fetchPublicTracking(supabase, trackingId);

  if (!tracking) {
    notFound();
  }

  const tone = PUBLIC_STATUS_TONES[tracking.status_bucket] ?? 'neutral';
  const toneClass = tone === 'success' ? 'border-success/40 text-success' : tone === 'warning' ? 'border-warning/40 text-warning' : tone === 'info' ? 'border-info/40 text-info' : 'border-border text-muted-foreground';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Request status</CardTitle>
              <CardDescription>Public tracking for outreach requests.</CardDescription>
            </div>
            <span className={`text-xs uppercase ${toneClass}`}>
              {formatCfsLabel(tracking.status_bucket)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking ID</p>
            <p className="text-base font-semibold text-foreground">{tracking.public_tracking_id}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
              <p className="font-medium">{formatCfsLabel(tracking.category)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location area</p>
              <p className="font-medium">{tracking.public_location_area}</p>
            </div>
          </div>
          {tracking.public_summary ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Update</p>
              <p className="font-medium">{tracking.public_summary}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</p>
            <p className="font-medium">{formatTimestamp(tracking.last_updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This page only shows limited, non-identifying status updates. It does not include personal information.</p>
          <p>If your request is urgent or you need to add details, contact the outreach team directly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
