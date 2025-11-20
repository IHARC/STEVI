import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ResourceRichTextEditor } from '@/components/admin/resource-rich-text-editor';
import { POLICY_CATEGORY_LABELS, type Policy } from '@/lib/policies';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const;

type PolicyFormProps = {
  mode: 'create' | 'edit';
  csrfToken: string;
  action: (formData: FormData) => Promise<void>;
  onDeleteAction?: (formData: FormData) => Promise<void>;
  policy?: Policy | null;
};

export function PolicyForm({ mode, csrfToken, action, onDeleteAction, policy }: PolicyFormProps) {
  const isEdit = mode === 'edit' && policy;

  const bodyDefault = policy?.bodyHtml ?? '';
  const summaryDefault = policy?.shortSummary ?? '';
  const slugDefault = policy?.slug ?? '';
  const statusDefault = policy?.status ?? 'draft';
  const categoryDefault = policy?.category ?? 'governance';
  const sortOrderDefault = policy?.sortOrder ?? 100;
  const lastReviewedDefault = policy?.lastReviewedAt?.slice(0, 10) ?? '';
  const effectiveFromDefault = policy?.effectiveFrom ?? '';
  const effectiveToDefault = policy?.effectiveTo ?? '';
  const internalRefDefault = policy?.internalRef ?? '';

  return (
    <div className="space-y-space-lg">
      <div className="rounded-3xl border border-outline/20 bg-surface-container p-space-md text-body-sm text-on-surface/80">
        <p>
          Keep policy copy plain, actionable, and trauma-informed. Emphasize client rights, harm reduction, and clear escalation steps. Avoid acronyms unless explained.
        </p>
      </div>

      <form action={action} className="space-y-space-lg">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        {isEdit ? (
          <>
            <input type="hidden" name="policy_id" value={policy.id} />
            <input type="hidden" name="current_slug" value={policy.slug} />
          </>
        ) : null}

        <fieldset className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_title">Title</Label>
            <Input
              id="policy_title"
              name="title"
              required
              maxLength={160}
              defaultValue={policy?.title ?? ''}
              placeholder="e.g. Client Rights & Responsibilities"
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_slug">Slug</Label>
            <Input
              id="policy_slug"
              name="slug"
              maxLength={80}
              defaultValue={slugDefault}
              placeholder="client-rights"
            />
            <p className="text-label-sm text-on-surface/60">Leave blank to auto-generate from the title.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_category">Category</Label>
            <Select name="category" defaultValue={categoryDefault} required>
              <SelectTrigger id="policy_category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(POLICY_CATEGORY_LABELS) as Array<keyof typeof POLICY_CATEGORY_LABELS>).map((value) => (
                  <SelectItem key={value} value={value}>
                    {POLICY_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <fieldset className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_status">Status</Label>
            <Select name="status" defaultValue={statusDefault} required>
              <SelectTrigger id="policy_status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_sort_order">Sort order</Label>
            <Input
              id="policy_sort_order"
              name="sort_order"
              type="number"
              inputMode="numeric"
              defaultValue={sortOrderDefault}
              min={0}
            />
            <p className="text-label-sm text-on-surface/60">Lower numbers appear first on listings.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_last_reviewed">Last reviewed</Label>
            <Input
              id="policy_last_reviewed"
              name="last_reviewed_at"
              type="date"
              defaultValue={lastReviewedDefault}
            />
            <p className="text-label-sm text-on-surface/60">Update when you complete a formal review.</p>
          </div>
        </fieldset>

        <fieldset className="grid gap-space-md md:grid-cols-2">
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_summary">Short summary</Label>
            <Textarea
              id="policy_summary"
              name="short_summary"
              rows={3}
              defaultValue={summaryDefault}
              placeholder="Summarize rights, responsibilities, and escalation steps in 2-3 sentences."
              required
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_internal_ref">Internal reference (optional)</Label>
            <Input
              id="policy_internal_ref"
              name="internal_ref"
              defaultValue={internalRefDefault}
              placeholder="Link or ref ID to internal SOP / document"
            />
            <p className="text-label-sm text-on-surface/60">Shown to staff only; not rendered on the public site.</p>
          </div>
        </fieldset>

        <fieldset className="grid gap-space-md md:grid-cols-2">
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_effective_from">Effective from (optional)</Label>
            <Input id="policy_effective_from" name="effective_from" type="date" defaultValue={effectiveFromDefault ?? ''} />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="policy_effective_to">Effective to (optional)</Label>
            <Input id="policy_effective_to" name="effective_to" type="date" defaultValue={effectiveToDefault ?? ''} />
          </div>
        </fieldset>

        <ResourceRichTextEditor
          name="body_html"
          label="Body content"
          defaultValue={bodyDefault}
          description="Use headings, bullet lists, and links. Avoid personal health details or identifying information."
        />

        <div className="rounded-2xl border border-outline/15 bg-surface-container-low p-space-sm text-body-sm text-on-surface/80">
          Visibility is controlled by the <strong>Status</strong> field above. Policies set to “Published” appear on the
          public site; “Draft” and “Archived” remain hidden.
        </div>

        <div className="flex flex-wrap gap-space-sm">
          <Button type="submit">{mode === 'create' ? 'Create policy' : 'Save changes'}</Button>
          <Button asChild variant="ghost">
            <Link href="/admin/policies">Back to admin overview</Link>
          </Button>
        </div>
      </form>

      {isEdit && policy && onDeleteAction ? (
        <form
          action={onDeleteAction}
          className="rounded-3xl border border-error/20 bg-error-container p-space-md text-on-error-container"
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <input type="hidden" name="policy_id" value={policy.id} />
          <input type="hidden" name="policy_slug" value={policy.slug} />
          <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-sm font-medium">Danger zone</p>
              <p className="text-label-sm text-on-error-container/80">
                Deleting removes this policy from marketing pages immediately.
              </p>
            </div>
            <Button type="submit" variant="destructive">
              Delete policy
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
