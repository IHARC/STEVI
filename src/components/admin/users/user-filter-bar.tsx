'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Option = { value: string; label: string };
type OrgOption = { id: number; name: string };

type UserFilterBarProps = {
  segment: string;
  organizations: OrgOption[];
  statusOptions: Option[];
  roleOptions: Option[];
  initial: {
    q: string;
    status: string;
    role: string;
    org: string;
    sort: string;
  };
};

export function UserFilterBar({ segment, organizations, statusOptions, roleOptions, initial }: UserFilterBarProps) {
  const [search, setSearch] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [role, setRole] = useState(initial.role);
  const [org, setOrg] = useState(initial.org);
  const [sort, setSort] = useState(initial.sort || 'recent');

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setRole('');
    setOrg('');
    setSort('recent');
  };

  return (
    <form className="grid gap-3 rounded-2xl border border-border/40 bg-card p-3 md:grid-cols-5" action={`/admin/users/${segment}`}>
      <input type="hidden" name="q" value={search} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="sort" value={sort} />

      <div className="md:col-span-2 space-y-1">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q_display"
          placeholder="Name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <SelectField id="status" label="Status" value={status} onChange={setStatus} options={statusOptions} />
      <SelectField id="role" label="Role" value={role} onChange={setRole} options={[{ value: '', label: 'Any role' }, ...roleOptions]} />
      <SelectField
        id="org"
        label="Organization"
        value={org}
        onChange={setOrg}
        options={[{ value: '', label: 'Any org' }, ...organizations.map((o) => ({ value: String(o.id), label: o.name }))]}
      />
      <SelectField
        id="sort"
        label="Sort"
        value={sort}
        onChange={setSort}
        options={[
          { value: 'recent', label: 'Recent activity' },
          { value: 'name', label: 'Name A–Z' },
        ]}
      />
      <div className="md:col-span-5 flex flex-wrap justify-end gap-2">
        <Button type="submit" variant="default">
          Apply
        </Button>
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Reset
        </Button>
      </div>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || 'any'} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
