import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type DocumentRecord = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  category: 'identity' | 'health' | 'housing' | 'supporting';
  downloadUrl?: string;
};

const fallbackDocuments: DocumentRecord[] = [
  {
    id: 'doc-health',
    title: 'Care plan summary',
    description: 'Outline of current health supports with consent preferences.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    category: 'health',
  },
  {
    id: 'doc-id',
    title: 'Ontario photo card renewal checklist',
    description: 'Documents needed and notes from ServiceOntario visit.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    category: 'identity',
  },
];

const formatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
});

function formatUpdatedAt(value: string) {
  try {
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
}

const categoryLabels: Record<DocumentRecord['category'], string> = {
  identity: 'Identity',
  health: 'Health',
  housing: 'Housing',
  supporting: 'Supporting document',
};

export default async function DocumentsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/documents');
  }

  await ensurePortalProfile(supabase, user.id);
  const documents = fallbackDocuments;

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Secure locker
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Your shared documents</h1>
        <p className="max-w-2xl text-body-md text-muted-foreground sm:text-body-lg">
          Files added here expire automatically and align with the outreach team’s attachment
          policies.
        </p>
      </header>

      <section aria-labelledby="documents-heading" className="grid gap-space-md sm:grid-cols-2">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle id="documents-heading" className="text-title-lg">
              Available documents
            </CardTitle>
            <CardDescription>
              Download links are secure for 30 minutes. Ask your worker to re-share anything you
              cannot access.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-space-md sm:grid-cols-2">
            {documents.map((document) => (
              <article
                key={document.id}
                className="flex h-full flex-col justify-between rounded-[var(--md-sys-shape-corner-medium)] border border-outline/20 bg-surface-container-low p-space-md shadow-level-1"
              >
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-title-md font-medium text-on-surface">{document.title}</h2>
                    <Badge variant="secondary">{categoryLabels[document.category]}</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{document.description}</p>
                  <p className="text-label-sm text-on-surface/60">
                    Updated {formatUpdatedAt(document.updatedAt)}
                  </p>
                </div>
                <div className="mt-space-md">
                  {document.downloadUrl ? (
                    <Button asChild className="w-full">
                      <a href={document.downloadUrl}>Download</a>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/support">Request download link</Link>
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {documents.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No documents yet. Outreach staff can add housing applications, safety plans, and
                proof-of-income letters here for you to access securely.
              </p>
            ) : null}
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
