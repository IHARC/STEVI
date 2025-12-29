'use client';

import { useMemo } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeSelect } from '@shared/ui/native-select';
import { Textarea } from '@shared/ui/textarea';
import {
  CFS_ACCESS_LEVEL_OPTIONS,
  CFS_STATUS_OPTIONS,
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  PUBLIC_CATEGORY_OPTIONS,
  REPORT_PRIORITY_OPTIONS,
  REPORT_STATUS_OPTIONS,
  VERIFICATION_METHOD_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  formatCfsLabel,
} from '@/lib/cfs/constants';
import {
  addCfsNoteAction,
  convertCfsToIncidentAction,
  dismissCfsAction,
  enablePublicTrackingAction,
  disablePublicTrackingAction,
  initialCfsActionState,
  markDuplicateCfsAction,
  shareCfsWithOrgAction,
  revokeCfsOrgAccessAction,
  transferCfsOwnershipAction,
  triageCfsAction,
  updateCfsStatusAction,
  verifyCfsAction,
} from '@/app/(ops)/ops/cfs/actions';

export type CfsDetailActionsProps = {
  cfsId: number;
  status: string | null;
  reportPriority: string | null;
  reportStatus: string | null;
  typeHint: string | null;
  priorityHint: string | null;
  verificationStatus: string | null;
  verificationMethod: string | null;
  verificationNotes: string | null;
  publicTrackingEnabled: boolean;
  publicTrackingId: string | null;
  publicTrackingCategory?: string | null;
  publicTrackingLocation?: string | null;
  publicTrackingSummary?: string | null;
  incidentId?: number | null;
  canTriage: boolean;
  canUpdate: boolean;
  canDispatch: boolean;
  canShare: boolean;
  canPublicTrack: boolean;
  organizations: Array<{ id: number; name: string | null }>;
  sharedAccess: Array<{ organization_id: number; access_level: string; is_active: boolean }>;
};

function ActionFeedback({ status, message }: { status: string; message?: string }) {
  if (!message) return null;
  const tone = status === 'error' ? 'text-destructive' : 'text-emerald-600';
  return <p className={`text-xs ${tone}`}>{message}</p>;
}

export function CfsDetailActions({
  cfsId,
  status,
  reportPriority,
  reportStatus,
  typeHint,
  priorityHint,
  verificationStatus,
  verificationMethod,
  verificationNotes,
  publicTrackingEnabled,
  publicTrackingId,
  publicTrackingCategory,
  publicTrackingLocation,
  publicTrackingSummary,
  incidentId,
  canTriage,
  canUpdate,
  canDispatch,
  canShare,
  canPublicTrack,
  organizations,
  sharedAccess,
}: CfsDetailActionsProps) {
  const [triageState, triageAction] = useFormState(triageCfsAction, initialCfsActionState);
  const [verifyState, verifyAction] = useFormState(verifyCfsAction, initialCfsActionState);
  const [dismissState, dismissAction] = useFormState(dismissCfsAction, initialCfsActionState);
  const [duplicateState, duplicateAction] = useFormState(markDuplicateCfsAction, initialCfsActionState);
  const [convertState, convertAction] = useFormState(convertCfsToIncidentAction, initialCfsActionState);
  const [shareState, shareAction] = useFormState(shareCfsWithOrgAction, initialCfsActionState);
  const [revokeState, revokeAction] = useFormState(revokeCfsOrgAccessAction, initialCfsActionState);
  const [transferState, transferAction] = useFormState(transferCfsOwnershipAction, initialCfsActionState);
  const [publicEnableState, publicEnableAction] = useFormState(enablePublicTrackingAction, initialCfsActionState);
  const [publicDisableState, publicDisableAction] = useFormState(disablePublicTrackingAction, initialCfsActionState);
  const [noteState, noteAction] = useFormState(addCfsNoteAction, initialCfsActionState);
  const [statusState, statusAction] = useFormState(updateCfsStatusAction, initialCfsActionState);

  const orgMap = useMemo(() => new Map(organizations.map((org) => [org.id, org.name ?? `Organization ${org.id}`])), [organizations]);

  return (
    <div className="space-y-6">
      {canTriage ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Triage</CardTitle>
            <CardDescription>Confirm priority and context before dispatching or closing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={triageAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="triage_priority">Priority assessment</Label>
                <NativeSelect id="triage_priority" name="report_priority_assessment" defaultValue={reportPriority ?? 'routine'}>
                  {REPORT_PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="triage_type">Type hint</Label>
                <NativeSelect id="triage_type" name="type_hint" defaultValue={typeHint ?? ''}>
                  <option value="">Select type</option>
                  {INCIDENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="triage_priority_hint">Dispatch priority hint</Label>
                <NativeSelect id="triage_priority_hint" name="priority_hint" defaultValue={priorityHint ?? ''}>
                  <option value="">Select dispatch priority</option>
                  {INCIDENT_PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="triage_urgency">Urgency indicators</Label>
                <Input id="triage_urgency" name="urgency_indicators" placeholder="Comma-separated" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="triage_notes">Triage notes</Label>
                <Textarea id="triage_notes" name="phase_notes" />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={triageState.status} message={triageState.message} />
                <Button type="submit">Save triage</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canTriage ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Verification</CardTitle>
            <CardDescription>Document how the report was verified and any notes for follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={verifyAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="verify_status">Verification status</Label>
                <NativeSelect id="verify_status" name="verification_status" defaultValue={verificationStatus ?? 'pending'}>
                  {VERIFICATION_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify_method">Verification method</Label>
                <NativeSelect id="verify_method" name="verification_method" defaultValue={verificationMethod ?? 'none_required'}>
                  {VERIFICATION_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="verify_notes">Verification notes</Label>
                <Textarea id="verify_notes" name="verification_notes" defaultValue={verificationNotes ?? ''} />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={verifyState.status} message={verifyState.message} />
                <Button type="submit">Save verification</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canDispatch ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Dispatch & incident conversion</CardTitle>
            <CardDescription>Convert this call into an incident record for field response tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidentId ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                Incident created: <strong>{incidentId}</strong>. Use the incident page to manage field response updates.
              </div>
            ) : (
              <form action={convertAction} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="cfs_id" value={cfsId} />
                <div className="space-y-2">
                  <Label htmlFor="incident_type">Incident type</Label>
                  <NativeSelect id="incident_type" name="incident_type" defaultValue={typeHint ?? ''}>
                    <option value="">Select incident type</option>
                    {INCIDENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatCfsLabel(option)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incident_status">Incident status</Label>
                  <NativeSelect id="incident_status" name="incident_status" defaultValue="open">
                    {['draft', 'open', 'in_progress', 'resolved', 'closed'].map((option) => (
                      <option key={option} value={option}>
                        {formatCfsLabel(option)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="incident_description">Incident description</Label>
                  <Textarea id="incident_description" name="incident_description" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="dispatch_notes">Dispatch notes</Label>
                  <Textarea id="dispatch_notes" name="dispatch_notes" />
                </div>
                <div className="md:col-span-2 flex justify-between items-center">
                  <ActionFeedback status={convertState.status} message={convertState.message} />
                  <Button type="submit">Convert to incident</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canUpdate ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Status updates</CardTitle>
            <CardDescription>Update the call status without closing or converting the request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={statusAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="cfs_status">Status</Label>
                <NativeSelect id="cfs_status" name="status" defaultValue={status ?? 'received'}>
                  {CFS_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="status_notes">Status notes</Label>
                <Textarea id="status_notes" name="status_notes" placeholder="Add a quick update for the timeline." />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={statusState.status} message={statusState.message} />
                <Button type="submit" variant="outline">Update status</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canUpdate ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Close or mark duplicate</CardTitle>
            <CardDescription>Resolve the call or merge it with an existing report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={dismissAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="report_status">Report status</Label>
                <NativeSelect id="report_status" name="report_status" defaultValue={reportStatus ?? 'resolved'}>
                  {REPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="resolution_notes">Resolution notes</Label>
                <Textarea id="resolution_notes" name="resolution_notes" />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={dismissState.status} message={dismissState.message} />
                <Button type="submit">Close call</Button>
              </div>
            </form>

            <form action={duplicateAction} className="grid gap-4 md:grid-cols-2 border-t border-border/50 pt-6">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="duplicate_of_report_id">Duplicate of report ID</Label>
                <Input id="duplicate_of_report_id" name="duplicate_of_report_id" type="number" min={1} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="duplicate_notes">Duplicate notes</Label>
                <Textarea id="duplicate_notes" name="duplicate_notes" />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={duplicateState.status} message={duplicateState.message} />
                <Button type="submit" variant="outline">Mark duplicate</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canPublicTrack ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Public tracking</CardTitle>
            <CardDescription>Share minimal status updates for community-facing requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {publicTrackingEnabled ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                Tracking is enabled. Public ID: <strong>{publicTrackingId ?? '—'}</strong>
              </div>
            ) : null}
            <form action={publicEnableAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="public_category">Category</Label>
                <NativeSelect id="public_category" name="public_category" defaultValue={publicTrackingCategory ?? 'cleanup'}>
                  {PUBLIC_CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public_location_area">Public location</Label>
                <Input id="public_location_area" name="public_location_area" defaultValue={publicTrackingLocation ?? ''} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="public_summary">Public summary</Label>
                <Textarea id="public_summary" name="public_summary" defaultValue={publicTrackingSummary ?? ''} />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={publicEnableState.status} message={publicEnableState.message} />
                <Button type="submit">Save public tracking</Button>
              </div>
            </form>

            {publicTrackingEnabled ? (
              <form action={publicDisableAction} className="flex items-center justify-between gap-4 border-t border-border/50 pt-4">
                <input type="hidden" name="cfs_id" value={cfsId} />
                <ActionFeedback status={publicDisableState.status} message={publicDisableState.message} />
                <Button type="submit" variant="outline">Disable tracking</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canShare ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Collaboration</CardTitle>
            <CardDescription>Share with partner organizations or transfer ownership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={shareAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="share_org">Organization</Label>
                <NativeSelect id="share_org" name="organization_id" defaultValue="">
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name ?? `Organization ${org.id}`}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="share_access">Access level</Label>
                <NativeSelect id="share_access" name="access_level" defaultValue="view">
                  {CFS_ACCESS_LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatCfsLabel(option)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="share_reason">Reason</Label>
                <Textarea id="share_reason" name="share_reason" />
              </div>
              <div className="md:col-span-2 flex justify-between items-center">
                <ActionFeedback status={shareState.status} message={shareState.message} />
                <Button type="submit">Share call</Button>
              </div>
            </form>

            {sharedAccess.length ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Shared organizations</p>
                <div className="space-y-2">
                  {sharedAccess.map((access) => (
                    <form key={access.organization_id} action={revokeAction} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                      <input type="hidden" name="cfs_id" value={cfsId} />
                      <input type="hidden" name="organization_id" value={access.organization_id} />
                      <div>
                        <p className="text-sm font-medium">{orgMap.get(access.organization_id) ?? `Organization ${access.organization_id}`}</p>
                        <p className="text-xs text-muted-foreground">Access: {formatCfsLabel(access.access_level)}</p>
                      </div>
                      <Button type="submit" size="sm" variant="outline">Revoke</Button>
                    </form>
                  ))}
                </div>
                <ActionFeedback status={revokeState.status} message={revokeState.message} />
              </div>
            ) : null}

            {canDispatch ? (
              <form action={transferAction} className="grid gap-4 md:grid-cols-2 border-t border-border/50 pt-6">
                <input type="hidden" name="cfs_id" value={cfsId} />
                <div className="space-y-2">
                  <Label htmlFor="transfer_org">Transfer ownership to</Label>
                  <NativeSelect id="transfer_org" name="organization_id" defaultValue="">
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name ?? `Organization ${org.id}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer_reason">Transfer reason</Label>
                  <Textarea id="transfer_reason" name="transfer_reason" />
                </div>
                <div className="md:col-span-2 flex justify-between items-center">
                  <ActionFeedback status={transferState.status} message={transferState.message} />
                  <Button type="submit" variant="outline">Transfer ownership</Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canUpdate ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Add a timeline note</CardTitle>
            <CardDescription>Capture quick updates for the response log.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={noteAction} className="space-y-4">
              <input type="hidden" name="cfs_id" value={cfsId} />
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" name="note" required minLength={4} />
              </div>
              <div className="flex justify-between items-center">
                <ActionFeedback status={noteState.status} message={noteState.message} />
                <Button type="submit">Add note</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
