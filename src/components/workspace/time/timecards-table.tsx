import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import type { TimeEntryWithProfile } from '@/lib/time/queries';

type TimecardsTableProps = {
  rows: TimeEntryWithProfile[];
  showProfile?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function formatMoney(value: number | null | undefined, currency = 'CAD') {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
}

export function TimecardsTable({ rows, showProfile = false }: TimecardsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showProfile ? <TableHead>Team member</TableHead> : null}
          <TableHead>Role</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Breaks</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showProfile ? 8 : 7} className="text-sm text-muted-foreground">
              No timecards found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              {showProfile ? (
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.profile?.display_name ?? 'Staff member'}</span>
                    {row.profile?.position_title ? (
                      <span className="text-xs text-muted-foreground">{row.profile.position_title}</span>
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
              <TableCell className="capitalize">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{row.role_name.replaceAll('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground">{row.role_kind}</span>
                </div>
              </TableCell>
              <TableCell>{formatTimestamp(row.shift_start)}</TableCell>
              <TableCell>{formatTimestamp(row.shift_end)}</TableCell>
              <TableCell>{formatDuration(row.break_minutes)}</TableCell>
              <TableCell>{formatDuration(row.total_minutes)}</TableCell>
              <TableCell>{formatMoney(row.cost_amount_snapshot ?? 0, row.currency)}</TableCell>
              <TableCell className="text-right">
                <span className="capitalize">
                  {row.status}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
