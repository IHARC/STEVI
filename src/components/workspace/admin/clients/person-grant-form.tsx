'use client';

import { useActionState, useState } from 'react';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import type { ActionState } from '@/lib/server-actions/validate';

type OrganizationOption = { id: number; name: string };

type PersonGrantFormProps = {
  personId: number;
  scopes: string[];
  organizations: OrganizationOption[];
  action: (formData: FormData) => Promise<ActionState<{ message?: string }>>;
};

type GrantActionState = ActionState<{ message?: string }>;

const initialState: GrantActionState = { status: 'idle' };

export function PersonGrantForm({ personId, scopes, organizations, action }: PersonGrantFormProps) {
  const [state, formAction] = useActionState(
    (_prev: GrantActionState, formData: FormData) => action(formData),
    initialState,
  );
  const [scope, setScope] = useState<string>(scopes[0] ?? '');
  const [orgId, setOrgId] = useState<string>('');
  const resolvedState = 'status' in state ? null : state;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;
  const successMessage = resolvedState && resolvedState.ok ? resolvedState.data?.message : null;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="grantee_org_id" value={orgId} />

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="scope-select">
          Scope
        </Label>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger id="scope-select">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            {scopes.length === 0 ? <SelectItem value="">No scopes configured</SelectItem> : null}
            {scopes.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">User ID (optional)</Label>
        <Input name="grantee_user_id" placeholder="UUID of user" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Organization (optional)</Label>
        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger id="grantee_org_id">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">—</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        Grant access
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="text-xs text-emerald-600">{successMessage}</p> : null}
    </form>
  );
}
