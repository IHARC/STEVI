import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPersonConsents } from '@/lib/cases/fetchers';
import { updateConsentsAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Checkbox } from '@shared/ui/checkbox';
import { choiceCardVariants } from '@shared/ui/choice-card';

export const dynamic = 'force-dynamic';

export default async function ConsentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/auth/start?next=/profile/consents');
  if (!access.isProfileApproved) redirect(resolveLandingPath(access));

  const consentData = await fetchPersonConsents(supabase, access.userId);

  return (
    <div className="flex flex-col gap-6">
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
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Onboarding in progress</CardTitle>
            <CardDescription>
              We have your intake, but a staff member needs to finish onboarding before you can manage consents here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Sharing and contact preferences</CardTitle>
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
    <form action={action} className="space-y-6">
      <input type="hidden" name="person_id" value={personId} />

      <section className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Data sharing</p>
          <p className="text-sm text-muted-foreground">
            Allow IHARC to share your information with partners directly involved in your support.
          </p>
        </div>
        <div className="max-h-48 overflow-auto rounded-xl border border-border/20 bg-background p-3 text-sm text-foreground/85">
          <p className="text-sm text-foreground/80">
            We only share details that are necessary to coordinate care, such as appointment notes, safety considerations,
            and contact information. Sharing helps speed up referrals and keeps your support circle aligned.
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/80">
            <li>Partners must follow IHARC privacy standards and delete data on request.</li>
            <li>You can revoke consent anytime; changes are logged for safety.</li>
            <li>We never sell or publish your information.</li>
          </ul>
        </div>
        <label className="flex items-start gap-3">
          <Checkbox id="data_sharing" name="data_sharing" defaultChecked={dataSharing} />
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-foreground">I consent to data sharing for my care.</span>
            <p className="text-sm text-muted-foreground">This keeps referrals moving; you can change this anytime.</p>
          </div>
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/30 bg-muted p-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Preferred contact</p>
          <p className="text-sm text-muted-foreground">Choose how IHARC should reach you for updates and check-ins.</p>
        </div>
        <RadioGroup defaultValue={preferredContact || 'email'} name="preferred_contact" className="grid gap-3 md:grid-cols-2">
          {['email', 'phone', 'both', 'none'].map((option) => (
            <label
              key={option}
              className={choiceCardVariants({ surface: 'background', padding: 'compact' })}
            >
              <RadioGroupItem value={option} />
              <div>
                <p className="text-base font-medium capitalize">{option}</p>
                <p className="text-sm text-muted-foreground">
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

      <section className="space-y-1 rounded-2xl border border-border/30 bg-muted p-4">
        <Label htmlFor="privacy_restrictions" className="text-base">
          Privacy notes
        </Label>
        <p className="text-sm text-muted-foreground">Add safety notes or restrictions (e.g., “Do not leave voicemail”).</p>
        <Textarea
          id="privacy_restrictions"
          name="privacy_restrictions"
          defaultValue={privacyRestrictions}
          rows={4}
          placeholder="Any limits we must follow when contacting you."
        />
      </section>

      <Button type="submit" className="w-fit px-6">Save preferences</Button>
    </form>
  );
}
