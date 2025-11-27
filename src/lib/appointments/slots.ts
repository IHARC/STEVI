const DAILY_SLOT_HOURS = [9, 11, 13, 15];

export function generateAvailabilitySlots(days: number = 7): string[] {
  const slots: string[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const base = new Date(now);
    base.setDate(now.getDate() + dayOffset);
    base.setHours(0, 0, 0, 0);

    for (const hour of DAILY_SLOT_HOURS) {
      const slot = new Date(base);
      slot.setHours(hour, 0, 0, 0);

      if (slot.getTime() > now.getTime()) {
        slots.push(slot.toISOString());
      }
    }
  }

  return slots;
}
