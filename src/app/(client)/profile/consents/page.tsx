import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPersonConsents } from '@/lib/cases/fetchers';
import { Card, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { getPolicyBySlug } from '@/lib/policies';
import { ConsentSettings } from '@client/consents/consent-settings-form';

export const dynamic = 'force-dynamic';

export default async function ConsentsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/auth/start?next=/profile/consents');
  if (!access.isProfileApproved) redirect(resolveLandingPath(access));

  const [consentData, privacyPolicy] = await Promise.all([
    fetchPersonConsents(supabase, { userId: access.userId, iharcOrgId: access.iharcOrganizationId }),
    getPolicyBySlug('client-privacy-notice'),
  ]);

  const policyVersion = privacyPolicy?.updatedAt ?? null;

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
        <ConsentSettings
          personId={consentData.personId}
          snapshot={consentData.snapshot}
          history={consentData.history}
          policyVersion={policyVersion}
        />
      )}
    </div>
  );
}
