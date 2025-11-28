import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingDocuments() {
  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-80" />
      </header>

      <section className="grid gap-space-md lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-title-lg">Available documents</CardTitle>
            <p className="text-body-sm text-muted-foreground">
              Links stay active for 30 minutes; we refresh them if they expire.
            </p>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md"
              >
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-space-2xs h-4 w-48" />
                <Skeleton className="mt-space-2xs h-4 w-40" />
                <div className="mt-space-sm flex flex-wrap gap-space-sm">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-title-md">Need a new document?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-2xs text-body-sm text-muted-foreground">
            <p>We’ll regenerate links or arrange pickup once the page finishes loading.</p>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
