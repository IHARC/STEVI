'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { useToast } from '@shared/ui/use-toast';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Textarea } from '@shared/ui/textarea';
import type { TimeEntryWithBreaks } from '@/lib/time/queries';
import {
  endBreakAction,
  endShiftAction,
  startBreakAction,
  startShiftAction,
  type TimeActionState,
} from '@/lib/time/actions';

const initialState: TimeActionState = { status: 'idle' };

type RoleOption = {
  id: string;
  name: string;
  displayName: string | null;
  roleKind: 'staff' | 'volunteer';
};

type TimeClockCardProps = {
  openShift: TimeEntryWithBreaks | null;
  roles: RoleOption[];
  orgMissing: boolean;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export function TimeClockCard({ openShift, roles, orgMissing }: TimeClockCardProps) {
  const [startState, startAction] = useFormState(startShiftAction, initialState);
  const [endState, endAction] = useFormState(endShiftAction, initialState);
  const [breakStartState, breakStartAction] = useFormState(startBreakAction, initialState);
  const [breakEndState, breakEndAction] = useFormState(endBreakAction, initialState);
  const { toast } = useToast();

  const openBreak = useMemo(() => {
    if (!openShift?.staff_break_entries) return null;
    return openShift.staff_break_entries.find((entry) => !entry.ended_at) ?? null;
  }, [openShift]);

  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    openShift ? Math.max(0, Math.floor((Date.now() - new Date(openShift.shift_start).getTime()) / 60000)) : 0,
  );

  useEffect(() => {
    if (!openShift) return;
    const timer = window.setInterval(() => {
      const diff = Date.now() - new Date(openShift.shift_start).getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diff / 60000)));
    }, 60000);
    return () => window.clearInterval(timer);
  }, [openShift]);

  useEffect(() => {
    if (startState.status === 'success') {
      toast({ title: 'Time updated', description: startState.message ?? 'Shift started.' });
    } else if (startState.status === 'error') {
      toast({ title: 'Time update failed', description: startState.message ?? 'Please try again.', variant: 'destructive' });
    }
  }, [startState, toast]);

  useEffect(() => {
    if (endState.status === 'success') {
      toast({ title: 'Time updated', description: endState.message ?? 'Shift closed.' });
    } else if (endState.status === 'error') {
      toast({ title: 'Time update failed', description: endState.message ?? 'Please try again.', variant: 'destructive' });
    }
  }, [endState, toast]);

  useEffect(() => {
    if (breakStartState.status === 'success') {
      toast({ title: 'Time updated', description: breakStartState.message ?? 'Break started.' });
    } else if (breakStartState.status === 'error') {
      toast({ title: 'Time update failed', description: breakStartState.message ?? 'Please try again.', variant: 'destructive' });
    }
  }, [breakStartState, toast]);

  useEffect(() => {
    if (breakEndState.status === 'success') {
      toast({ title: 'Time updated', description: breakEndState.message ?? 'Break ended.' });
    } else if (breakEndState.status === 'error') {
      toast({ title: 'Time update failed', description: breakEndState.message ?? 'Please try again.', variant: 'destructive' });
    }
  }, [breakEndState, toast]);

  const roleOptions = roles.slice().sort((a, b) => {
    const labelA = (a.displayName ?? a.name).toLowerCase();
    const labelB = (b.displayName ?? b.name).toLowerCase();
    return labelA.localeCompare(labelB);
  });

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Time clock</CardTitle>
        <CardDescription>Clock in/out, add notes, and track breaks for this organization.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {openShift ? (
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase">
                Shift open
              </span>
              <span className="text-xs uppercase">
                {openShift.role_kind === 'volunteer' ? 'Volunteer' : 'Staff'}
              </span>
              {openBreak ? (
                <span className="text-xs uppercase">
                  Break running
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="text-xs uppercase text-foreground/60">Started</span>
                <p className="font-medium text-foreground">{formatTimestamp(openShift.shift_start)}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-foreground/60">Elapsed</span>
                <p className="font-medium text-foreground">{formatDuration(elapsedMinutes)}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-foreground/60">Role</span>
                <p className="font-medium text-foreground">{openShift.role_name.replaceAll('_', ' ')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {openBreak ? (
                <form action={breakEndAction}>
                  <input type="hidden" name="break_id" value={openBreak.id} />
                  <Button type="submit" size="sm" variant="outline">
                    End break
                  </Button>
                </form>
              ) : (
                <form action={breakStartAction}>
                  <input type="hidden" name="time_entry_id" value={openShift.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Start break
                  </Button>
                </form>
              )}
              <form action={endAction}>
                <input type="hidden" name="time_entry_id" value={openShift.id} />
                <Button type="submit" size="sm">
                  Clock out
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <form action={startAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="time-role">Role for this shift</label>
                <select
                  id="time-role"
                  name="role_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  required
                  defaultValue={roleOptions[0]?.id ?? ''}
                  disabled={orgMissing || roleOptions.length === 0}
                >
                  {roleOptions.length === 0 ? (
                    <option value="">No roles available</option>
                  ) : (
                    roleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {(role.displayName ?? role.name).replaceAll('_', ' ')} · {role.roleKind}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium" htmlFor="time-notes">Notes (optional)</label>
                <Textarea id="time-notes" name="notes" placeholder="Shift notes" maxLength={1200} rows={2} />
              </div>
            </div>
            {orgMissing ? (
              <p className="text-xs text-muted-foreground">Select an acting organization before clocking in.</p>
            ) : null}
            <Button type="submit" size="sm" disabled={orgMissing || roleOptions.length === 0}>
              Clock in
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
