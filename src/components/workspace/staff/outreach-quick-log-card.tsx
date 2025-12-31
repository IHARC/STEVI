'use client';

import { useEffect, useActionState } from 'react';
import type { ReactNode } from 'react';

import { staffLogOutreachAction, type OutreachFormState } from '@/lib/staff/actions';
import { useToast } from '@shared/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Button } from '@shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';

const initialState: OutreachFormState = { status: 'idle' };

type CostCategoryOption = { name: string | null };

type ServiceCatalogOption = {
  service_code: string | null;
  label: string | null;
  unit_type: string | null;
};

type OutreachQuickLogCardProps = {
  personId: number;
  orgMissing: boolean;
  showCostFields: boolean;
  staffRoles: string[];
  costCategories: CostCategoryOption[];
  serviceCatalog: ServiceCatalogOption[];
  variant?: 'card' | 'sheet';
  triggerLabel?: string;
  trigger?: ReactNode;
};

export function OutreachQuickLogCard({
  personId,
  orgMissing,
  showCostFields,
  staffRoles,
  costCategories,
  serviceCatalog,
  variant = 'card',
  triggerLabel = 'Log outreach',
  trigger,
}: OutreachQuickLogCardProps) {
  const [state, formAction] = useActionState(staffLogOutreachAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Outreach saved', description: state.message ?? 'Outreach logged successfully.' });
    } else if (state.status === 'error') {
      toast({ title: 'Unable to log outreach', description: state.message ?? 'Please try again.', variant: 'destructive' });
    }
  }, [state, toast]);

  const staffRoleOptions = staffRoles.filter(Boolean);
  const categoryOptions = costCategories.filter((category) => Boolean(category.name));
  const serviceOptions = serviceCatalog.filter((service) => Boolean(service.service_code));

  const form = (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="outreach-title">Title</label>
            <Input id="outreach-title" name="title" placeholder="Outreach check-in" required maxLength={160} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="outreach-occurred">Occurred at</label>
            <Input id="outreach-occurred" name="occurred_at" type="datetime-local" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="outreach-summary">Summary</label>
          <Textarea id="outreach-summary" name="summary" placeholder="What happened?" maxLength={1200} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="outreach-location">Location</label>
          <Input id="outreach-location" name="location" placeholder="Downtown outreach" maxLength={240} />
        </div>

        {showCostFields ? (
          <details className="rounded-lg border border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Costing details (optional)</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-duration">Duration (minutes)</label>
                <Input id="outreach-duration" name="duration_minutes" type="number" min={1} step="1" placeholder="45" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-staff-role">Staff role</label>
                <Input
                  id="outreach-staff-role"
                  name="staff_role"
                  list="outreach-staff-roles"
                  placeholder="Outreach worker"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-service">Service code</label>
                <Input
                  id="outreach-service"
                  name="service_code"
                  list="outreach-service-codes"
                  placeholder="outreach_visit"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-units">Units</label>
                <Input id="outreach-units" name="units" type="number" min={0.01} step="0.01" placeholder="1" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-cost-override">Cost override (CAD)</label>
                <Input id="outreach-cost-override" name="cost_override" type="number" min={0.01} step="0.01" placeholder="75" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-cost-category">Cost category</label>
                <Input
                  id="outreach-cost-category"
                  name="cost_category"
                  list="outreach-cost-categories"
                  placeholder="staff_time"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="outreach-uom">Unit of measure</label>
                <Input id="outreach-uom" name="uom" placeholder="hour" />
              </div>
            </div>
          </details>
        ) : null}
      </div>

      {staffRoleOptions.length > 0 ? (
        <datalist id="outreach-staff-roles">
          {staffRoleOptions.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>
      ) : null}

      {serviceOptions.length > 0 ? (
        <datalist id="outreach-service-codes">
          {serviceOptions.map((service) => (
            <option
              key={service.service_code ?? ''}
              value={service.service_code ?? ''}
              label={service.label ?? service.unit_type ?? undefined}
            />
          ))}
        </datalist>
      ) : null}

      {categoryOptions.length > 0 ? (
        <datalist id="outreach-cost-categories">
          {categoryOptions.map((category) => (
            <option key={category.name ?? ''} value={category.name ?? ''} />
          ))}
        </datalist>
      ) : null}

      {orgMissing ? (
        <p className="text-xs text-muted-foreground">Select an acting organization before logging outreach.</p>
      ) : null}

      <Button type="submit" size="sm" disabled={orgMissing}>
        Save outreach
      </Button>
    </form>
  );

  if (variant === 'sheet') {
    return (
      <Sheet>
        <SheetTrigger asChild disabled={orgMissing}>
          {trigger ?? (
            <Button variant="outline" size="sm" disabled={orgMissing}>
              {triggerLabel}
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader className="text-left">
            <SheetTitle>Log outreach</SheetTitle>
            <SheetDescription>Capture a quick outreach contact and optional costing details.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">Log outreach</CardTitle>
        <CardDescription>Capture a quick outreach contact and optional costing details.</CardDescription>
      </CardHeader>
      <CardContent>
        {form}
      </CardContent>
    </Card>
  );
}
