import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingAppointments() {
  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </header>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Appointments timeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                We respond within one business day; requests stay here while we confirm.
              </p>
            </div>
            <Skeleton className="h-9 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border/40 bg-muted p-4"
              >
                <Skeleton className="h-4 w-48" />
                <div className="mt-3 space-y-1">
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
