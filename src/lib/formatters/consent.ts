import { formatEnumLabel } from './text';

export function formatConsentStatus(status: string | null | undefined): string {
  if (!status) return 'Not recorded';
  if (status === 'active') return 'Active';
  if (status === 'expired') return 'Expired';
  if (status === 'revoked') return 'Revoked';
  return formatEnumLabel(status, status);
}

export function formatConsentScope(scope: string | null | undefined): string {
  if (!scope) return 'No scope';
  if (scope === 'all_orgs') return 'All orgs';
  if (scope === 'selected_orgs') return 'Selected orgs';
  if (scope === 'none') return 'No sharing';
  return formatEnumLabel(scope, scope);
}
