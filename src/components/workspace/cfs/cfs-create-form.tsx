'use client';

import { useMemo, useState, useActionState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Combobox, type ComboboxOption } from '@shared/ui/combobox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Switch } from '@shared/ui/switch';
import { Textarea } from '@shared/ui/textarea';
import {
  CFS_ORIGIN_OPTIONS,
  CFS_SOURCE_OPTIONS,
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  NOTIFY_CHANNEL_OPTIONS,
  PUBLIC_CATEGORY_OPTIONS,
  REPORT_METHOD_OPTIONS,
  REPORT_PRIORITY_OPTIONS,
  formatCfsLabel,
} from '@/lib/cfs/constants';
import { createCfsCallAction, initialCfsActionState } from '@/app/(ops)/ops/cfs/actions';
import { CfsPersonSearch } from '@/components/workspace/cfs/cfs-person-search';

const locationConfidenceOptions = ['exact', 'approximate', 'general_area', 'unknown'];

export type OrganizationOption = { id: number; name: string | null };

type CfsCreateFormProps = {
  organizations: OrganizationOption[];
  canPublicTrack: boolean;
};

type OrganizationComboboxProps = {
  name: string;
  label: string;
  options: ComboboxOption[];
  disabled?: boolean;
  helperText?: string;
};

function OrganizationCombobox({ name, label, options, disabled, helperText }: OrganizationComboboxProps) {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-combobox`}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <Combobox
        value={value}
        onValueChange={setValue}
        options={options}
        placeholder="Select organization"
        searchPlaceholder="Search organizations"
        emptyLabel="No matches."
        disabled={disabled}
      />
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

export function CfsCreateForm({ organizations, canPublicTrack }: CfsCreateFormProps) {
  const [state, formAction] = useActionState(createCfsCallAction, initialCfsActionState);
  const [anonymousReporter, setAnonymousReporter] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [publicTrackingEnabled, setPublicTrackingEnabled] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<'email' | 'sms'>('email');
  const [formResetKey, setFormResetKey] = useState(0);
  const resolvedState = 'status' in state ? null : state;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;

  const handleNotifyToggle = (value: boolean) => {
    setNotifyEnabled(value);
    if (!value) {
      setNotifyChannel('email');
    }
  };

  const orgOptions = useMemo(() => organizations.filter((org) => org.id > 0), [organizations]);
  const orgSelectOptions = useMemo<ComboboxOption[]>(
    () =>
      orgOptions.map((org) => ({
        value: String(org.id),
        label: org.name ?? `Organization ${org.id}`,
        keywords: org.name ?? undefined,
      })),
    [orgOptions],
  );

  return (
    <form action={formAction} className="space-y-6">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to create call</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Intake details</CardTitle>
          <CardDescription>Capture how this request came in and how urgent it appears.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="origin">Origin</Label>
            <NativeSelect id="origin" name="origin" defaultValue="community">
              {CFS_ORIGIN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <NativeSelect id="source" name="source" defaultValue="phone">
              {CFS_SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report_method">Report method</Label>
            <NativeSelect id="report_method" name="report_method" defaultValue="phone">
              {REPORT_METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report_priority_assessment">Priority assessment</Label>
            <NativeSelect id="report_priority_assessment" name="report_priority_assessment" defaultValue="routine">
              {REPORT_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type_hint">Type hint</Label>
            <NativeSelect id="type_hint" name="type_hint" defaultValue="">
              <option value="">Select type (optional)</option>
              {INCIDENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority_hint">Dispatch priority hint</Label>
            <NativeSelect id="priority_hint" name="priority_hint" defaultValue="">
              <option value="">Select dispatch priority (optional)</option>
              {INCIDENT_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report_received_at">Report received at</Label>
            <Input id="report_received_at" name="report_received_at" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="received_at">Entered into system at</Label>
            <Input id="received_at" name="received_at" type="datetime-local" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="urgency_indicators">Urgency indicators</Label>
            <Input id="urgency_indicators" name="urgency_indicators" placeholder="Comma-separated (e.g., weapons, overdose, children present)" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Location</CardTitle>
          <CardDescription>Use the most accurate location available. Avoid exact addresses for public tracking.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location_text">Location description</Label>
            <Input id="location_text" name="location_text" placeholder="Near 5th St and Pine Ave, behind the library" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reported_location">Reported address or landmark</Label>
            <Input id="reported_location" name="reported_location" placeholder="123 Main St" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reported_coordinates">Reported coordinates</Label>
            <Input id="reported_coordinates" name="reported_coordinates" placeholder="43.123,-79.234" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_confidence">Location confidence</Label>
            <NativeSelect id="location_confidence" name="location_confidence" defaultValue="unknown">
              {locationConfidenceOptions.map((option) => (
                <option key={option} value={option}>
                  {formatCfsLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Reporter details</CardTitle>
          <CardDescription>Capture who reported the request and how to reach them if needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Anonymous reporter</p>
              <p className="text-xs text-muted-foreground">Use this when the reporter prefers not to share identifying details.</p>
            </div>
            <Switch checked={anonymousReporter} onCheckedChange={setAnonymousReporter} />
            <input type="hidden" name="anonymous_reporter" value={anonymousReporter ? 'true' : 'false'} />
          </div>

          {anonymousReporter ? (
            <div className="space-y-2">
              <Label htmlFor="anonymous_reporter_details">Anonymous notes</Label>
              <Textarea id="anonymous_reporter_details" name="anonymous_reporter_details" placeholder="Preferred anonymity reason or anonymous contact notes." />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reporter_name">Reporter name</Label>
                <Input id="reporter_name" name="reporter_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporter_relationship">Relationship</Label>
                <Input id="reporter_relationship" name="reporter_relationship" placeholder="Neighbor, business owner, client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporter_phone">Phone</Label>
                <Input id="reporter_phone" name="reporter_phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporter_email">Email</Label>
                <Input id="reporter_email" name="reporter_email" type="email" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reporter_address">Address</Label>
                <Input id="reporter_address" name="reporter_address" />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2" key={`${anonymousReporter ? 'anon' : 'named'}-${formResetKey}`}>
            <CfsPersonSearch
              key={`person-${formResetKey}`}
              name="reporting_person_id"
              label="Linked person (optional)"
              disabled={anonymousReporter}
              helperText="Search for a known client or community member."
            />
            <OrganizationCombobox
              key={`reporting-org-${formResetKey}`}
              name="reporting_organization_id"
              label="Reporting organization (optional)"
              options={orgSelectOptions}
              disabled={anonymousReporter}
              helperText="Use an org only if they initiated the report."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <OrganizationCombobox
              key={`referring-org-${formResetKey}`}
              name="referring_organization_id"
              label="Referring organization (optional)"
              options={orgSelectOptions}
            />
            <div className="space-y-2">
              <Label htmlFor="referring_agency_name">Referring agency name</Label>
              <Input id="referring_agency_name" name="referring_agency_name" placeholder="City cleanup hotline" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Narrative</CardTitle>
          <CardDescription>Summarize the request clearly so dispatch can triage quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="initial_report_narrative">Initial report narrative</Label>
            <Textarea
              id="initial_report_narrative"
              name="initial_report_narrative"
              required
              minLength={8}
              className="min-h-[160px]"
              placeholder="What was observed? Who is involved? Any immediate safety issues?"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Notification preferences</CardTitle>
          <CardDescription>Only notify if the reporter has opted in to updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Send status updates</p>
              <p className="text-xs text-muted-foreground">Send updates by email or SMS with consent.</p>
            </div>
            <Switch checked={notifyEnabled} onCheckedChange={handleNotifyToggle} />
            <input type="hidden" name="notify_opt_in" value={notifyEnabled ? 'true' : 'false'} />
          </div>

          {notifyEnabled ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notify_channel">Channel</Label>
                <NativeSelect
                  id="notify_channel"
                  name="notify_channel"
                  value={notifyChannel}
                  onChange={(event) => setNotifyChannel(event.target.value as 'email' | 'sms')}
                >
                  {NOTIFY_CHANNEL_OPTIONS.filter((option) => option !== 'none').map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notify_target">{notifyChannel === 'sms' ? 'Mobile number' : 'Email address'}</Label>
                <Input
                  id="notify_target"
                  name="notify_target"
                  type={notifyChannel === 'sms' ? 'tel' : 'email'}
                  placeholder={notifyChannel === 'sms' ? '+1 555 555 5555' : 'reporter@example.org'}
                  required={notifyEnabled}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canPublicTrack ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Public tracking (optional)</CardTitle>
            <CardDescription>
              Only enable for low-risk requests. Do not enable for person-linked or sensitive calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Enable public tracking</p>
                <p className="text-xs text-muted-foreground">Public view will only show status, category, and coarse location.</p>
              </div>
              <Switch checked={publicTrackingEnabled} onCheckedChange={setPublicTrackingEnabled} />
              <input type="hidden" name="public_tracking_enabled" value={publicTrackingEnabled ? 'true' : 'false'} />
            </div>

            {publicTrackingEnabled ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="public_category">Public category</Label>
                  <NativeSelect id="public_category" name="public_category" defaultValue="cleanup" required>
                    {PUBLIC_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatCfsLabel(option)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public_location_area">Public location area</Label>
                  <Input id="public_location_area" name="public_location_area" placeholder="Downtown core" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="public_summary">Public summary</Label>
                  <Textarea id="public_summary" name="public_summary" placeholder="Request received; outreach team en route." />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Create call</Button>
        <Button
          type="reset"
          variant="outline"
          onClick={() => {
            setAnonymousReporter(false);
            setNotifyEnabled(false);
            setPublicTrackingEnabled(false);
            setNotifyChannel('email');
            setFormResetKey((value) => value + 1);
          }}
        >
          Reset form
        </Button>
      </div>
    </form>
  );
}
