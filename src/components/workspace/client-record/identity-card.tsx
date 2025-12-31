'use client';

import { useActionState, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import {
  createAliasAction as createAliasActionFn,
  setAliasActiveAction as setAliasActiveActionFn,
  updateAliasAction as updateAliasActionFn,
  updatePersonIdentityAction,
} from '@/lib/client-record/actions';
import { GENDER_OPTIONS } from '@/lib/client-record/constants';
import { clientRecordInitialState } from '@/lib/client-record/form-state';
import type { ClientAliasSummary, ClientPersonSummary } from '@/lib/client-record/types';

const EMPTY_MESSAGE = '—';

type IdentityCardProps = {
  person: ClientPersonSummary;
  aliases: ClientAliasSummary[];
  canEdit?: boolean;
};

export function IdentityCard({ person, aliases, canEdit = false }: IdentityCardProps) {
  const { toast } = useToast();
  const [identityState, identityAction] = useActionState(updatePersonIdentityAction, clientRecordInitialState);
  const [createAliasState, createAliasAction] = useActionState(createAliasActionFn, clientRecordInitialState);
  const [updateAliasState, updateAliasAction] = useActionState(updateAliasActionFn, clientRecordInitialState);
  const [setAliasState, setAliasAction] = useActionState(setAliasActiveActionFn, clientRecordInitialState);
  const [showAliasEditor, setShowAliasEditor] = useState(false);
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [editingAliasId, setEditingAliasId] = useState<ClientAliasSummary['id'] | null>(null);
  const [showInactiveAliases, setShowInactiveAliases] = useState(false);

  useEffect(() => {
    if (identityState.status === 'success') {
      toast({ title: 'Basic information updated', description: identityState.message ?? 'Basic information saved.' });
    }
    if (identityState.status === 'error') {
      toast({
        title: 'Basic information update failed',
        description: identityState.message ?? 'Check the form and try again.',
        variant: 'destructive',
      });
    }
  }, [identityState, toast]);

  useEffect(() => {
    if (createAliasState.status === 'success') {
      toast({ title: 'Alias saved', description: createAliasState.message ?? 'Alias added.' });
    }
    if (createAliasState.status === 'error') {
      toast({ title: 'Alias failed', description: createAliasState.message ?? 'Check the alias and try again.', variant: 'destructive' });
    }
  }, [createAliasState, toast]);

  useEffect(() => {
    if (updateAliasState.status === 'success') {
      toast({ title: 'Alias updated', description: updateAliasState.message ?? 'Alias updated.' });
    }
    if (updateAliasState.status === 'error') {
      toast({ title: 'Alias update failed', description: updateAliasState.message ?? 'Check the alias and try again.', variant: 'destructive' });
    }
  }, [updateAliasState, toast]);

  useEffect(() => {
    if (setAliasState.status === 'success') {
      toast({ title: 'Alias updated', description: setAliasState.message ?? 'Alias status saved.' });
    }
    if (setAliasState.status === 'error') {
      toast({ title: 'Alias update failed', description: setAliasState.message ?? 'Check the alias and try again.', variant: 'destructive' });
    }
  }, [setAliasState, toast]);

  const activeAliases = aliases.filter((alias) => alias.is_active);
  const inactiveAliases = aliases.filter((alias) => !alias.is_active);
  const aliasList = activeAliases.map((alias) => alias.alias_name).filter(Boolean);
  const ageValue = resolveAge(person.age, person.date_of_birth);
  const dobValue = person.date_of_birth ? formatDate(person.date_of_birth) : EMPTY_MESSAGE;
  const genderValue = person.gender ? person.gender : EMPTY_MESSAGE;
  const pronounsValue = person.preferred_pronouns?.trim() ? person.preferred_pronouns : EMPTY_MESSAGE;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Basic information</CardTitle>
          <CardDescription>Key demographics for this record.</CardDescription>
        </div>
        {canEdit ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Edit basic info</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
              <SheetHeader className="text-left">
                <SheetTitle>Edit basic information</SheetTitle>
                <SheetDescription>Correct names, demographics, and pronouns as needed.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <form action={identityAction} className="space-y-3">
                  <input type="hidden" name="person_id" value={person.id} />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="identity_first_name">First name</Label>
                      <Input id="identity_first_name" name="first_name" defaultValue={person.first_name ?? ''} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="identity_last_name">Last name</Label>
                      <Input id="identity_last_name" name="last_name" defaultValue={person.last_name ?? ''} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="identity_dob">Date of birth</Label>
                      <Input id="identity_dob" name="date_of_birth" type="date" defaultValue={person.date_of_birth ?? ''} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="identity_age">Approx age</Label>
                      <Input id="identity_age" name="age" type="number" min={0} max={130} defaultValue={person.age ?? ''} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="identity_gender">Gender</Label>
                      <NativeSelect id="identity_gender" name="gender" defaultValue={person.gender ?? ''}>
                        <option value="">Not specified</option>
                        {GENDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="identity_pronouns">Preferred pronouns</Label>
                      <Input id="identity_pronouns" name="preferred_pronouns" defaultValue={person.preferred_pronouns ?? ''} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="identity_change_reason">Change reason (optional)</Label>
                    <Textarea id="identity_change_reason" name="change_reason" rows={2} placeholder="Correction, new info, etc." />
                  </div>

                  <Button type="submit" size="sm">Save basic info</Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Age</dt>
            <dd className="font-medium text-foreground">{ageValue ?? EMPTY_MESSAGE}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">DOB</dt>
            <dd className="font-medium text-foreground">{dobValue}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gender</dt>
            <dd className="font-medium text-foreground">{genderValue}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pronouns</dt>
            <dd className="font-medium text-foreground">{pronounsValue}</dd>
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aliases</dt>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setShowAliasEditor((current) => {
                      const next = !current;
                      if (!next) {
                        setShowAddAlias(false);
                        setEditingAliasId(null);
                        setShowInactiveAliases(false);
                      }
                      return next;
                    });
                  }}
                  aria-expanded={showAliasEditor}
                  aria-controls="alias-editor-panel"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {showAliasEditor ? 'Hide' : 'Edit aliases'}
                  </span>
                </Button>
              ) : null}
            </div>
            <dd className="mt-2 font-medium text-foreground">
              {aliasList.length ? (
                <div className="flex flex-wrap gap-2">
                  {aliasList.map((alias) => (
                    <Badge key={alias} variant="outline">{alias}</Badge>
                  ))}
                </div>
              ) : (
                EMPTY_MESSAGE
              )}
            </dd>
            {canEdit && showAliasEditor ? (
              <div
                id="alias-editor-panel"
                className="mt-3 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Alias list</p>
                    <p className="text-xs text-muted-foreground">Keep aliases on file; remove only if inaccurate.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddAlias((current) => !current)}
                  >
                    {showAddAlias ? 'Cancel' : 'Add alias'}
                  </Button>
                </div>

                {showAddAlias ? (
                  <form action={createAliasAction} className="grid gap-2 rounded-lg border border-border/60 bg-background p-3">
                    <input type="hidden" name="person_id" value={person.id} />
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-1">
                        <Label htmlFor="alias_new">Alias</Label>
                        <Input id="alias_new" name="alias_name" placeholder="Nickname or street name" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="alias_new_reason">Reason (optional)</Label>
                        <Input id="alias_new_reason" name="change_reason" placeholder="Correction, new info" />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" size="sm">Add</Button>
                      </div>
                    </div>
                  </form>
                ) : null}

                <div className="rounded-lg border border-border/60 bg-background">
                  {activeAliases.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No active aliases.</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {activeAliases.map((alias) => (
                        <div key={alias.id} className="p-3">
                          {editingAliasId === alias.id ? (
                            <form action={updateAliasAction} className="grid gap-2">
                              <input type="hidden" name="person_id" value={person.id} />
                              <input type="hidden" name="alias_id" value={alias.id} />
                              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                                <div className="space-y-1">
                                  <Label htmlFor={`alias_${alias.id}`}>Alias</Label>
                                  <Input id={`alias_${alias.id}`} name="alias_name" defaultValue={alias.alias_name} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`alias_reason_${alias.id}`}>Reason (optional)</Label>
                                  <Input id={`alias_reason_${alias.id}`} name="change_reason" placeholder="Correction, new info" />
                                </div>
                                <div className="flex items-end gap-2">
                                  <Button type="submit" size="sm" variant="outline">Save</Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAliasId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">{alias.alias_name}</p>
                              <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAliasId(alias.id)}>
                                  Edit
                                </Button>
                                <form action={setAliasAction}>
                                  <input type="hidden" name="person_id" value={person.id} />
                                  <input type="hidden" name="alias_id" value={alias.id} />
                                  <input type="hidden" name="is_active" value="false" />
                                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                                    Delete
                                  </Button>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {inactiveAliases.length ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-0 text-sm text-muted-foreground"
                      onClick={() => setShowInactiveAliases((current) => !current)}
                    >
                      {showInactiveAliases ? 'Hide inactive aliases' : `Show inactive aliases (${inactiveAliases.length})`}
                    </Button>
                    {showInactiveAliases ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-background/60">
                        <div className="divide-y divide-border/60">
                          {inactiveAliases.map((alias) => (
                            <div key={alias.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                              <p className="text-sm font-medium text-muted-foreground">{alias.alias_name}</p>
                              <form action={setAliasAction}>
                                <input type="hidden" name="person_id" value={person.id} />
                                <input type="hidden" name="alias_id" value={alias.id} />
                                <input type="hidden" name="is_active" value="true" />
                                <Button type="submit" size="sm" variant="outline">Restore</Button>
                              </form>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function resolveAge(age: number | null, dateOfBirth: string | null | undefined) {
  if (typeof age === 'number' && Number.isFinite(age)) {
    return age;
  }
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthday) years -= 1;
  return years >= 0 ? years : null;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}
