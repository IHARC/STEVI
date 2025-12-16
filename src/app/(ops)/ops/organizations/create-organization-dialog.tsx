'use client';

import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeCheckbox } from '@shared/ui/native-checkbox';
import { NativeSelect } from '@shared/ui/native-select';
import { Separator } from '@shared/ui/separator';
import { Textarea } from '@shared/ui/textarea';
import { useToast } from '@shared/ui/use-toast';
import { ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import type { CreateOrganizationState } from './actions';

type CreateOrganizationDialogProps = {
  action: (state: CreateOrganizationState, formData: FormData) => Promise<CreateOrganizationState>;
};

const INITIAL_STATE: CreateOrganizationState = { status: 'idle' };

export function CreateOrganizationDialog({ action }: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setInstance((current) => current + 1);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Create organization</Button>
      </DialogTrigger>
      <CreateOrganizationDialogBody key={instance} action={action} onClose={() => setOpen(false)} />
    </Dialog>
  );
}

function CreateOrganizationDialogBody({
  action,
  onClose,
}: CreateOrganizationDialogProps & { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  const featureOptions = useMemo(() => ORG_FEATURE_OPTIONS, []);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Organization created', description: state.message ?? 'Saved.' });
      onClose();
      startTransition(() => router.refresh());
    }
    if (state.status === 'error') {
      toast({ title: 'Unable to create organization', description: state.message ?? 'Action failed.', variant: 'destructive' });
    }
  }, [onClose, router, state.message, state.status, toast]);

  return (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>Create a partner record for referrals, inventory attribution, and tenant access.</DialogDescription>
        </DialogHeader>

        {state.status === 'error' ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create organization</AlertTitle>
            <AlertDescription>{state.message ?? 'Check the form and try again.'}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Organization name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.org" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue="active">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
                <option value="under_review">under review</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="organization_type">Organization type</Label>
              <NativeSelect id="organization_type" name="organization_type" defaultValue="">
                <option value="">Not set</option>
                <option value="addiction">addiction</option>
                <option value="crisis_support">crisis support</option>
                <option value="food_services">food services</option>
                <option value="housing">housing</option>
                <option value="mental_health">mental health</option>
                <option value="multi_service">multi service</option>
                <option value="healthcare">healthcare</option>
                <option value="government">government</option>
                <option value="non_profit">non profit</option>
                <option value="faith_based">faith based</option>
                <option value="community_center">community center</option>
                <option value="legal_services">legal services</option>
                <option value="other">other</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="partnership_type">Partnership type</Label>
              <NativeSelect id="partnership_type" name="partnership_type" defaultValue="">
                <option value="">Not set</option>
                <option value="referral_partner">referral partner</option>
                <option value="service_provider">service provider</option>
                <option value="funding_partner">funding partner</option>
                <option value="collaborative_partner">collaborative partner</option>
                <option value="resource_partner">resource partner</option>
                <option value="other">other</option>
              </NativeSelect>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NativeCheckbox id="is_active" name="is_active" defaultChecked />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Features</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {featureOptions.map((feature) => (
                <label key={feature.value} className="flex items-center gap-2 text-sm">
                  <NativeCheckbox name="features" value={feature.value} />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (internal)</Label>
            <Textarea id="notes" name="notes" placeholder="Optional internal notes" rows={3} />
          </div>

          <DialogFooter className="gap-2">
            <DialogCancelButton onCancel={onClose} />
            <DialogSubmitButton />
          </DialogFooter>
        </form>
    </DialogContent>
  );
}

function DialogSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create'}
    </Button>
  );
}

function DialogCancelButton({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
      Cancel
    </Button>
  );
}
