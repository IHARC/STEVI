import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listClientDocuments } from '@/lib/documents';
import { ClientPreviewGuard } from '@/components/layout/client-preview-guard';
import { requestDocumentLinkAction, extendDocumentAccessAction } from './actions';
import { DocumentsList } from './documents-list';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/documents');
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const documents = await listClientDocuments(profile.id);

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">
          Secure locker
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Your shared documents</h1>
        <p className="max-w-2xl text-body-md text-muted-foreground sm:text-body-lg">
          Files added here expire automatically and align with the outreach team’s attachment
          policies.
        </p>
      </header>

      <section aria-labelledby="documents-heading" className="grid gap-space-md lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle id="documents-heading" className="text-title-lg">
              Available documents
            </CardTitle>
            <CardDescription>
              Download links stay active for 30 minutes. Ask us to refresh or extend access if one expires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientPreviewGuard message="Downloads are disabled in preview. Exit preview to access documents.">
              <DocumentsList
                documents={documents}
                onRequestLink={requestDocumentLinkAction}
                onExtendAccess={extendDocumentAccessAction}
              />
            </ClientPreviewGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-md">Need a new document?</CardTitle>
            <CardDescription>
              Reach out if you need identification support, appeal letters, or assessment notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm text-body-sm text-muted-foreground">
            <p>
              Message the outreach coordination inbox at{' '}
              <a
                href="mailto:support@iharc.ca"
                className="text-primary underline-offset-4 hover:underline"
              >
                support@iharc.ca
              </a>{' '}
              or phone <a href="tel:2895550100">289-555-0100</a>.
            </p>
            <p>
              Staff can upload files from STEVI Ops, trigger moderation, and mark when you’ve viewed
              them.
            </p>
            <p>
              If you prefer paper copies, let us know and we’ll arrange a pickup or drop-off window.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
