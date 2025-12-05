'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

type AvailabilityPickerProps = {
  slots: string[];
  targetInputId: string;
  label?: string;
};

const formatter = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function AvailabilityPicker({ slots, targetInputId, label }: AvailabilityPickerProps) {
  const applySlot = useCallback(
    (iso: string) => {
      const input = document.getElementById(targetInputId) as HTMLInputElement | null;
      if (!input) return;
      const localValue = iso.slice(0, 16); // YYYY-MM-DDTHH:mm from ISO
      input.value = localValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    [targetInputId],
  );

  if (!slots.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-foreground">{label ?? 'Quick pick slots'}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => (
          <Button
            key={slot}
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => applySlot(slot)}
          >
            {formatter.format(new Date(slot))}
          </Button>
        ))}
      </div>
    </div>
  );
}
