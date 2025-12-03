import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPersonConsents } from '@/lib/cases/fetchers';
import { updateConsentsAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Checkbox } from '@/components/ui/checkbox';

export const dynamic = 'force-dynamic';

export default async function ConsentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/profile/consents');
  if (!access.isProfileApproved) redirect(resolveLandingPath(access));

  const consentData = await fetchPersonConsents(supabase, access.userId);

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Privacy & contact"
        title="My consents"
        description="Choose who can access your information and how IHARC can reach you. Changes are logged for safety."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/support">Need help? Message support</Link>
          </Button>
        }
      />

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

      <section className="space-y-space-sm rounded-2xl border border-outline/12 bg-surface-container-low p-space-md">
        <div className="space-y-space-2xs">
          <p className="text-title-sm font-semibold text-on-surface">Data sharing</p>
          <p className="text-body-sm text-muted-foreground">
            Allow IHARC to share your information with partners directly involved in your support.
          </p>
        </div>
        <div className="max-h-48 overflow-auto rounded-xl border border-outline/10 bg-surface p-space-sm text-body-sm text-on-surface/85">
          <p className="text-body-sm text-on-surface/80">
            We only share details that are necessary to coordinate care, such as appointment notes, safety considerations,
            and contact information. Sharing helps speed up referrals and keeps your support circle aligned.
          </p>
          <ul className="mt-space-2xs list-disc space-y-space-2xs pl-5 text-body-sm text-on-surface/80">
            <li>Partners must follow IHARC privacy standards and delete data on request.</li>
            <li>You can revoke consent anytime; changes are logged for safety.</li>
            <li>We never sell or publish your information.</li>
          </ul>
        </div>
        <label className="flex items-start gap-space-sm">
          <Checkbox id="data_sharing" name="data_sharing" defaultChecked={dataSharing} />
          <div className="space-y-space-3xs">
            <span className="text-label-md font-medium text-on-surface">I consent to data sharing for my care.</span>
            <p className="text-body-sm text-muted-foreground">This keeps referrals moving; you can change this anytime.</p>
          </div>
        </label>
      </section>

      <section className="space-y-space-sm rounded-2xl border border-outline/12 bg-surface-container-low p-space-md">
        <div className="space-y-space-2xs">
          <p className="text-title-sm font-semibold text-on-surface">Preferred contact</p>
          <p className="text-body-sm text-muted-foreground">Choose how IHARC should reach you for updates and check-ins.</p>
        </div>
        <RadioGroup defaultValue={preferredContact || 'email'} name="preferred_contact" className="grid gap-space-sm md:grid-cols-2">
          {['email', 'phone', 'both', 'none'].map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-space-sm rounded-xl border border-outline/20 bg-surface px-space-sm py-space-sm text-left text-on-surface shadow-level-1 state-layer-color-primary hover:border-primary"
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
      </section>

      <section className="space-y-space-2xs rounded-2xl border border-outline/12 bg-surface-container-low p-space-md">
        <Label htmlFor="privacy_restrictions" className="text-title-sm">
          Privacy notes
        </Label>
        <p className="text-body-sm text-muted-foreground">Add safety notes or restrictions (e.g., “Do not leave voicemail”).</p>
        <Textarea
          id="privacy_restrictions"
          name="privacy_restrictions"
          defaultValue={privacyRestrictions}
          rows={4}
          placeholder="Any limits we must follow when contacting you."
        />
      </section>

      <Button type="submit" className="w-fit px-space-lg">Save preferences</Button>
    </form>
  );
}
