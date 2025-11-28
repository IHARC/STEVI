export const ORG_INVITE_EVENT = 'org_invite' as const;

export const ORG_INVITE_RATE_LIMIT = {
  limit: 5,
  cooldownMs: 10 * 60 * 1000, // 10 minutes
} as const;

export function formatInviteCooldown(retryInMs: number): string {
  if (retryInMs <= 0) {
    return 'Invite limit reached. Try again shortly.';
  }

  const minutes = Math.max(1, Math.ceil(retryInMs / 60_000));
  if (minutes === 1) {
    return 'Invite limit reached. Try again in about a minute.';
  }

  return `Invite limit reached. Try again in about ${minutes} minutes.`;
}
