'use client';

import { useEffect, useActionState } from 'react';

import type { JusticeEpisodeSummary } from '@/lib/justice/types';
import { createJusticeEpisodeAction, type JusticeEpisodeFormState } from '@/lib/justice/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Badge } from '@shared/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';

const initialState: JusticeEpisodeFormState = { status: 'idle' };

const EPISODE_TYPES = [
  { value: 'arrest', label: 'Arrest' },
  { value: 'charge', label: 'Charge' },
  { value: 'court', label: 'Court' },
  { value: 'probation', label: 'Probation' },
  { value: 'parole', label: 'Parole' },
  { value: 'warrant', label: 'Warrant' },
  { value: 'other', label: 'Other' },
];

const SOURCE_OPTIONS = [
  { value: 'staff_observed', label: 'Staff observed' },
  { value: 'client_reported', label: 'Client reported' },
  { value: 'document', label: 'Document' },
  { value: 'partner_org', label: 'Partner org' },
  { value: 'system', label: 'System' },
];

const VERIFICATION_OPTIONS = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'verified', label: 'Verified' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'stale', label: 'Stale' },
];

const VISIBILITY_OPTIONS = [
  { value: 'internal_to_org', label: 'Internal only' },
  { value: 'shared_via_consent', label: 'Share via consent' },
];

const SENSITIVITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'high', label: 'High' },
  { value: 'restricted', label: 'Restricted' },
];

type JusticeEpisodesCardProps = {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  episodes: JusticeEpisodeSummary[];
  formVariant?: 'inline' | 'sheet';
};

export function JusticeEpisodesCard({ personId, caseId, encounterId, episodes, formVariant = 'inline' }: JusticeEpisodesCardProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createJusticeEpisodeAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Justice update saved', description: state.message ?? 'Justice record updated.' });
    }
    if (state.status === 'error') {
      toast({ title: 'Justice update failed', description: state.message ?? 'Check the form and try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const form = (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      {caseId ? <input type="hidden" name="case_id" value={caseId} /> : null}
      {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_episode_type">Episode type</Label>
          <NativeSelect id="justice_episode_type" name="episode_type" defaultValue="other">
            {EPISODE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_event_date">Event date</Label>
          <Input id="justice_event_date" name="event_date" type="date" required />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_event_time">Event time</Label>
          <Input id="justice_event_time" name="event_time" type="time" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_agency">Agency</Label>
          <Input id="justice_agency" name="agency" placeholder="OPP, RCMP" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="justice_charges">Charges</Label>
        <Input id="justice_charges" name="charges" placeholder="Charge details" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_court_date">Court date</Label>
          <Input id="justice_court_date" name="court_date" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_check_in_date">Check-in date</Label>
          <Input id="justice_check_in_date" name="check_in_date" type="date" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="justice_notes">Notes</Label>
        <Textarea id="justice_notes" name="notes" rows={3} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_source">Source</Label>
          <NativeSelect id="justice_source" name="source" defaultValue="staff_observed">
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_verification">Verification</Label>
          <NativeSelect id="justice_verification" name="verification_status" defaultValue="unverified">
            {VERIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="justice_visibility">Visibility</Label>
          <NativeSelect id="justice_visibility" name="visibility_scope" defaultValue="internal_to_org">
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="justice_sensitivity">Sensitivity</Label>
          <NativeSelect id="justice_sensitivity" name="sensitivity_level" defaultValue="standard">
            {SENSITIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <Button type="submit" size="sm">Save justice update</Button>
    </form>
  );

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Justice history</CardTitle>
          <CardDescription>Track court dates, supervision, and outcomes.</CardDescription>
        </div>
        {formVariant === 'sheet' ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Add justice update</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Add justice update</SheetTitle>
                <SheetDescription>Capture court, supervision, and case outcomes.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{form}</div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No justice updates recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-xl border border-border/40 bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{episode.charges ?? 'Justice episode'}</p>
                    <p className="text-xs text-muted-foreground">{episode.episodeType}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(episode.eventDate).toLocaleDateString()}</div>
                </div>
                {episode.notes ? <p className="mt-2 text-sm text-foreground/80">{episode.notes}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{episode.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}</Badge>
                  {episode.courtDate ? <Badge variant="secondary">Court date</Badge> : null}
                  {episode.createdByOrg ? <Badge variant="outline">{episode.createdByOrg}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {formVariant === 'inline' ? (
          <details className="rounded-xl border border-dashed border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Add justice update</summary>
            <div className="mt-3">{form}</div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
