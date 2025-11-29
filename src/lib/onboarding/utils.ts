import type { PortalAccess } from '@/lib/portal-access';

export type OnboardingActor = 'client' | 'staff' | 'partner';

export function resolveOnboardingActor(access: PortalAccess | null): OnboardingActor {
  if (access?.canAccessStaffWorkspace || access?.canManageConsents) {
    return 'staff';
  }

  if (access?.canAccessOrgWorkspace) {
    return 'partner';
  }

  return 'client';
}

type ContactContextInput = {
  contactWindow?: string | null;
  postalCode?: string | null;
  dobMonth?: number | null;
  dobYear?: number | null;
  safeCall?: boolean;
  safeText?: boolean;
  safeVoicemail?: boolean;
  extraNote?: string | null;
};

export function composeContactContext(input: ContactContextInput): string | null {
  const parts: string[] = [];

  if (input.safeCall || input.safeText || input.safeVoicemail) {
    const channels = [
      input.safeCall ? 'voice' : null,
      input.safeText ? 'text' : null,
      input.safeVoicemail ? 'voicemail' : null,
    ].filter(Boolean);
    if (channels.length) {
      parts.push(`Safe contact: ${channels.join(', ')}`);
    }
  }

  if (input.contactWindow?.trim()) {
    parts.push(`Contact window: ${input.contactWindow.trim()}`);
  }

  if (input.postalCode?.trim()) {
    parts.push(`Postal code: ${input.postalCode.trim()}`);
  }

  if (input.dobYear && input.dobMonth) {
    const month = String(input.dobMonth).padStart(2, '0');
    parts.push(`Birth month/year: ${month}/${input.dobYear}`);
  }

  if (input.extraNote?.trim()) {
    parts.push(input.extraNote.trim());
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' • ');
}
