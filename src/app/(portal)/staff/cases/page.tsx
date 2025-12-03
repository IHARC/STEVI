import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { fetchStaffCaseload, fetchStaffShifts } from '@/lib/staff/fetchers';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { StaffCasesBoard } from './_components/staff-cases-board';

export const dynamic = 'force-dynamic';

export default async function StaffCasesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/staff/cases');
  if (!access.canAccessStaffWorkspace) redirect(resolveLandingPath(access));

  const [cases, caseload, shifts] = await Promise.all([
    fetchStaffCases(supabase, 160),
    fetchStaffCaseload(supabase, access.userId),
    fetchStaffShifts(supabase, access.userId),
  ]);

  const normalizedCaseload = caseload
    .map((entry) => ({
      personId: Number.parseInt(entry.id, 10),
      clientName: entry.clientName,
      nextStep: entry.nextStep,
      nextAt: entry.nextAt,
      status: entry.status,
    }))
    .filter((entry) => Number.isFinite(entry.personId));

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Caseload</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Cases</h1>
        <p className="max-w-4xl text-body-md text-muted-foreground">
          Saved views, peek panel, and quick outreach entry keep staff aligned without leaving the app. RLS and audit
          logging stay in effect.
        </p>
      </header>

      <StaffCasesBoard cases={cases} caseload={normalizedCaseload} shifts={shifts} />
    </div>
  );
}
