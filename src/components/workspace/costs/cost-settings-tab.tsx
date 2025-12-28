import { createCostDimensionAction, createServiceCatalogAction, createStaffRateAction, deleteCostDimensionAction, endStaffRateAction, updateServiceCatalogAction } from '@/lib/costs/actions';
import type { CostCategory, CostDimension, ServiceCatalogEntry, StaffRate } from '@/lib/costs/queries';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Textarea } from '@shared/ui/textarea';

const todayIso = new Date().toISOString().slice(0, 10);
const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function CostSettingsTab({
  staffRates,
  serviceCatalog,
  costCategories,
  costDimensions,
  canManageCosts,
  canAdminCosts,
}: {
  staffRates: StaffRate[] | null;
  serviceCatalog: ServiceCatalogEntry[] | null;
  costCategories: CostCategory[] | null;
  costDimensions: CostDimension[] | null;
  canManageCosts: boolean;
  canAdminCosts: boolean;
}) {
  if (!canManageCosts && !canAdminCosts) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Costs</CardTitle>
          <CardDescription>You do not have permission to manage cost settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const categories = costCategories ?? [];
  const rates = staffRates ?? [];
  const catalog = serviceCatalog ?? [];
  const dimensions = costDimensions ?? [];
  const categoryLookup = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Staff rates</CardTitle>
          <CardDescription>Rates are used to calculate staff time costs for outreach and appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createStaffRateAction} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="role_name">Role name</Label>
              <Input id="role_name" name="role_name" placeholder="Outreach worker" required />
            </div>
            <div>
              <Label htmlFor="hourly_rate">Hourly rate</Label>
              <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" min="0" required />
            </div>
            <div>
              <Label htmlFor="effective_from">Effective from</Label>
              <Input id="effective_from" name="effective_from" type="date" defaultValue={todayIso} required />
            </div>
            <div>
              <Label htmlFor="effective_to">Effective to (optional)</Label>
              <Input id="effective_to" name="effective_to" type="date" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit">Add rate</Button>
            </div>
          </form>

          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff rates configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Hourly rate</th>
                    <th className="py-2 pr-4">Effective</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id} className="border-b border-border/30">
                      <td className="py-3 pr-4 text-foreground">{rate.role_name}</td>
                      <td className="py-3 pr-4 text-foreground">${Number(rate.hourly_rate).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(rate.effective_from)} – {formatDate(rate.effective_to)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={rate.effective_to ? 'outline' : 'secondary'}>
                          {rate.effective_to ? 'Ended' : 'Active'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {!rate.effective_to ? (
                          <form action={endStaffRateAction} className="flex items-center gap-2">
                            <input type="hidden" name="rate_id" value={rate.id} />
                            <Input name="effective_to" type="date" defaultValue={todayIso} required />
                            <Button type="submit" size="sm" variant="outline">End</Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Service catalog</CardTitle>
          <CardDescription>Unit costs for services logged in outreach and visit workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createServiceCatalogAction} className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <Label htmlFor="service_code">Service code</Label>
              <Input id="service_code" name="service_code" placeholder="outreach_visit" required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" name="label" placeholder="Outreach visit" required />
            </div>
            <div>
              <Label htmlFor="unit_cost">Unit cost</Label>
              <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" required />
            </div>
            <div>
              <Label htmlFor="unit_type">Unit type</Label>
              <Input id="unit_type" name="unit_type" placeholder="visit" required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="default_category">Default category</Label>
              <NativeSelect id="default_category" name="default_category" required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit">Add service</Button>
            </div>
          </form>

          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service catalog entries configured yet.</p>
          ) : (
            <div className="space-y-3">
              {catalog.map((entry) => (
                <form key={entry.id} action={updateServiceCatalogAction} className="grid gap-3 rounded-lg border border-border/40 p-3 md:grid-cols-6">
                  <input type="hidden" name="entry_id" value={entry.id} />
                  <div className="md:col-span-2">
                    <Label className="text-xs">Service code</Label>
                    <Input value={entry.service_code} readOnly className="bg-muted" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Label</Label>
                    <Input name="label" defaultValue={entry.label} required />
                  </div>
                  <div>
                    <Label className="text-xs">Unit cost</Label>
                    <Input name="unit_cost" type="number" step="0.01" min="0" defaultValue={entry.unit_cost} required />
                  </div>
                  <div>
                    <Label className="text-xs">Unit type</Label>
                    <Input name="unit_type" defaultValue={entry.unit_type} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Default category</Label>
                    <NativeSelect
                      name="default_category"
                      defaultValue={entry.default_category_id ? categoryLookup.get(entry.default_category_id) ?? '' : ''}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="md:col-span-6 flex justify-end">
                    <Button type="submit" variant="outline">Save changes</Button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl">Cost dimensions</CardTitle>
          <CardDescription>Define dimension labels for funding, programs, and outreach types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canAdminCosts ? (
            <form action={createCostDimensionAction} className="grid gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="dimension_type">Dimension type</Label>
                <Input id="dimension_type" name="dimension_type" placeholder="program" required />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Housing outreach" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit">Add dimension</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">IHARC admins manage global cost dimensions.</p>
          )}

          {dimensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cost dimensions defined yet.</p>
          ) : (
            <div className="space-y-2">
              {dimensions.map((dimension) => (
                <div key={dimension.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{dimension.name}</p>
                    <p className="text-xs text-muted-foreground">{dimension.dimension_type}</p>
                    {dimension.description ? <p className="text-xs text-muted-foreground">{dimension.description}</p> : null}
                  </div>
                  {canAdminCosts ? (
                    <form action={deleteCostDimensionAction}>
                      <input type="hidden" name="dimension_id" value={dimension.id} />
                      <Button type="submit" size="sm" variant="outline">Delete</Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
