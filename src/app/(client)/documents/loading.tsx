import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export default function LoadingDocuments() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-80" />
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Available documents</CardTitle>
            <p className="text-sm text-muted-foreground">
              Links stay active for 30 minutes; we refresh them if they expire.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border/40 bg-muted p-4"
              >
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-1 h-4 w-48" />
                <Skeleton className="mt-1 h-4 w-40" />
                <div className="mt-3 flex flex-wrap gap-3">
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
            <CardTitle className="text-lg">Need a new document?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>We’ll regenerate links or arrange pickup once the page finishes loading.</p>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
