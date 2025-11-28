import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingAppointments() {
  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </header>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-space-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-space-2xs">
              <CardTitle className="text-title-lg">Appointments timeline</CardTitle>
              <p className="text-body-sm text-muted-foreground">
                We respond within one business day; requests stay here while we confirm.
              </p>
            </div>
            <Skeleton className="h-9 w-28" />
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-outline/20 bg-surface-container-low p-space-md"
              >
                <Skeleton className="h-4 w-48" />
                <div className="mt-space-sm space-y-space-2xs">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-52" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
