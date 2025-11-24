import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPersonConsents } from '@/lib/cases/fetchers';
import { updateConsentsAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function ConsentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/profile/consents');
  if (!access.isProfileApproved) redirect(resolveDefaultWorkspacePath(access));

  const consentData = await fetchPersonConsents(supabase, access.userId);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Privacy & contact</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">My consents</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Choose who can access your information and how IHARC can reach you. Changes are logged for safety.
        </p>
      </header>

      {!consentData ? (
        <Card className="border-dashed border-outline/60">
          <CardHeader>
            <CardTitle className="text-title-md">Onboarding in progress</CardTitle>
            <CardDescription>
              We have your intake, but a staff member needs to finish onboarding before you can manage consents here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Sharing and contact preferences</CardTitle>
            <CardDescription>Updates take effect immediately and are recorded in the audit log.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsentForm
              personId={consentData.personId}
              dataSharing={consentData.snapshot.dataSharing ?? false}
              preferredContact={consentData.snapshot.preferredContactMethod ?? 'email'}
              privacyRestrictions={consentData.snapshot.privacyRestrictions ?? ''}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConsentForm({
  personId,
  dataSharing,
  preferredContact,
  privacyRestrictions,
}: {
  personId: number;
  dataSharing: boolean;
  preferredContact: string;
  privacyRestrictions: string;
}) {
  'use client';

  const action = updateConsentsAction;

  return (
    <form action={action} className="space-y-space-lg">
      <input type="hidden" name="person_id" value={personId} />

      <div className="space-y-space-2xs">
        <Label className="text-title-sm">Data sharing</Label>
        <p className="text-body-sm text-muted-foreground">Allow IHARC to share your information with partners directly involved in your support.</p>
        <div className="flex items-center gap-space-sm">
          <input type="checkbox" id="data_sharing" name="data_sharing" defaultChecked={dataSharing} className="h-4 w-4 rounded border-outline/60" />
          <Label htmlFor="data_sharing">I consent to data sharing for my care.</Label>
        </div>
      </div>

      <div className="space-y-space-2xs">
        <Label className="text-title-sm">Preferred contact</Label>
        <RadioGroup defaultValue={preferredContact || 'email'} name="preferred_contact" className="grid gap-space-sm md:grid-cols-2">
          {['email', 'phone', 'both', 'none'].map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-space-sm rounded-xl border border-outline/40 bg-surface-container p-space-sm text-left text-on-surface shadow-subtle state-layer-color-primary hover:border-primary"
            >
              <RadioGroupItem value={option} />
              <div>
                <p className="text-title-sm font-medium capitalize">{option}</p>
                <p className="text-body-sm text-muted-foreground">
                  {option === 'none'
                    ? 'We will not call or message you. Updates happen in person or via the portal.'
                    : option === 'both'
                      ? 'Use both phone and email depending on urgency.'
                      : `Prefer ${option} for routine updates.`}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-space-2xs">
        <Label htmlFor="privacy_restrictions" className="text-title-sm">Privacy notes</Label>
        <p className="text-body-sm text-muted-foreground">Add safety notes or restrictions (e.g., “Do not leave voicemail”).</p>
        <Textarea
          id="privacy_restrictions"
          name="privacy_restrictions"
          defaultValue={privacyRestrictions}
          rows={3}
          placeholder="Any limits we must follow when contacting you."
        />
      </div>

      <Button type="submit" className="w-full">Save preferences</Button>
    </form>
  );
}
