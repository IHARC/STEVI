import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ResourceRichTextEditor } from '@/components/admin/resource-rich-text-editor';
import { ResourceAutosaveClient } from './resource-autosave-client';
import { RESOURCE_KIND_LABELS, type Resource } from '@/lib/resources';
import { attachmentsToTextarea, getResourceEmbedDefaults } from './resource-utils';

type ResourceFormProps = {
  mode: 'create' | 'edit';
  action: (formData: FormData) => Promise<void>;
  onDeleteAction?: (formData: FormData) => Promise<void>;
  resource?: Resource | null;
};

export function ResourceForm({ mode, action, onDeleteAction, resource }: ResourceFormProps) {
  const isEdit = mode === 'edit' && resource;

  const embedDefaults = resource ? getResourceEmbedDefaults(resource) : { type: 'none', url: '', provider: 'youtube', label: '', html: '' };
  const attachmentsDefault = resource ? attachmentsToTextarea(resource.attachments) : '';
  const tagsDefault = resource ? resource.tags.join(', ') : '';
  const bodyHtmlDefault = resource?.bodyHtml ?? '';
  const summaryDefault = resource?.summary ?? '';
  const locationDefault = resource?.location ?? '';
  const publishDefault = resource?.isPublished ?? true;
  const embedPlacementDefault = resource?.embedPlacement ?? 'above';

  return (
    <div className="space-y-space-lg">
      <div className="rounded-3xl border border-outline/20 bg-surface-container p-space-md text-body-sm text-on-surface/80">
        <p>
          Speak in plain, strengths-based language. Highlight community collaboration, note Good Samaritan protections for overdose response, and repeat that neighbours
          should call 911 during emergencies.
        </p>
      </div>

      <form action={action} className="space-y-space-lg">
        {isEdit ? (
          <>
            <input type="hidden" name="resource_id" value={resource.id} />
            <input type="hidden" name="current_slug" value={resource.slug} />
          </>
        ) : null}

        <fieldset className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_title">Title</Label>
            <Input
              id="resource_title"
              name="title"
              required
              maxLength={160}
              defaultValue={resource?.title ?? ''}
              placeholder="e.g. Coordinated Emergency Shelter Update"
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_slug">Slug</Label>
            <Input
              id="resource_slug"
              name="slug"
              maxLength={80}
              defaultValue={resource?.slug ?? ''}
              placeholder="coordinated-shelter-update"
            />
            <p className="text-label-sm text-on-surface/60">Leave blank to auto-generate from the title.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_kind">Resource type</Label>
            <Select name="kind" defaultValue={resource?.kind ?? 'report'} required>
              <SelectTrigger id="resource_kind">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RESOURCE_KIND_LABELS) as Array<keyof typeof RESOURCE_KIND_LABELS>).map((value) => (
                  <SelectItem key={value} value={value}>
                    {RESOURCE_KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resource_date">Publication date</Label>
            <Input
              id="resource_date"
              name="date_published"
              type="date"
              required
              defaultValue={resource?.datePublished ?? ''}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-space-md md:grid-cols-2">
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_summary">Summary</Label>
            <Textarea
              id="resource_summary"
              name="summary"
              rows={3}
              defaultValue={summaryDefault}
              placeholder="Summarize key actions, partners, and next steps."
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_location">Location (optional)</Label>
            <Input
              id="resource_location"
              name="location"
              defaultValue={locationDefault}
              placeholder="Northumberland County Council Chambers"
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_tags">Tags (comma separated)</Label>
            <Input
              id="resource_tags"
              name="tags"
              defaultValue={tagsDefault}
              placeholder="housing, overdose response, outreach"
            />
            <p className="text-label-sm text-on-surface/60">Use lower-case keywords so filters stay consistent.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_attachments">Attachments (optional)</Label>
            <Textarea
              id="resource_attachments"
              name="attachments"
              rows={3}
              defaultValue={attachmentsDefault}
              placeholder="Download the briefing (PDF) | https://example.ca/briefing.pdf"
            />
            <p className="text-label-sm text-on-surface/60">One per line using “Label | https://link”. Only trusted hosts should be listed.</p>
          </div>
        </fieldset>

        <fieldset className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_embed_type">Embed</Label>
            <Select name="embed_type" defaultValue={embedDefaults.type}>
              <SelectTrigger id="resource_embed_type">
                <SelectValue placeholder="Select embed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No embed</SelectItem>
                <SelectItem value="google-doc">Google Doc</SelectItem>
                <SelectItem value="pdf">PDF viewer</SelectItem>
                <SelectItem value="video">Video (YouTube or Vimeo)</SelectItem>
                <SelectItem value="external">External link</SelectItem>
                <SelectItem value="html">Custom HTML snippet</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-label-sm text-on-surface/60">Only trusted hosts are allowed. Snippets are sanitized before publishing.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_embed_placement">Embed placement</Label>
            <Select name="embed_placement" defaultValue={embedPlacementDefault}>
              <SelectTrigger id="resource_embed_placement">
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Above body content</SelectItem>
                <SelectItem value="below">Below body content</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-label-sm text-on-surface/60">Choose how the embed anchors alongside the written summary.</p>
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="resource_embed_url">Embed URL</Label>
            <Input
              id="resource_embed_url"
              name="embed_url"
              defaultValue={embedDefaults.url}
              placeholder="https://docs.google.com/..."
            />
            <p className="text-label-sm text-on-surface/60">Required for Google Docs, PDFs, videos, and external links.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resource_embed_provider">Video provider</Label>
            <Select name="embed_provider" defaultValue={embedDefaults.provider}>
              <SelectTrigger id="resource_embed_provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resource_embed_label">External link label</Label>
            <Input
              id="resource_embed_label"
              name="embed_label"
              defaultValue={embedDefaults.label}
              placeholder="Open resource"
            />
          </div>
          <div className="grid gap-space-xs md:col-span-2 lg:col-span-3">
            <Label htmlFor="resource_embed_html">Custom HTML snippet</Label>
            <Textarea
              id="resource_embed_html"
              name="embed_html"
              rows={4}
              defaultValue={embedDefaults.html}
              placeholder="<iframe ...></iframe>"
            />
          </div>
        </fieldset>

        <ResourceRichTextEditor
          name="body_html"
          label="Body content"
          defaultValue={bodyHtmlDefault}
          description="Use headings, bullet lists, and links so neighbours can scan actions quickly."
          showPreview
        />

        {isEdit && resource?.id ? <ResourceAutosaveClient resourceId={resource.id} /> : null}

        <div className="flex items-center gap-space-xs">
          <Checkbox id="resource_is_published" name="is_published" defaultChecked={publishDefault} />
          <Label htmlFor="resource_is_published" className="text-body-sm">
            Visible on the public marketing page
          </Label>
        </div>

        <div className="flex flex-wrap gap-space-sm">
          <Button type="submit">
            {mode === 'create' ? 'Create resource' : 'Save changes'}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/resources">Back to admin overview</Link>
          </Button>
        </div>
      </form>

      {isEdit && resource && onDeleteAction ? (
        <form
          action={onDeleteAction}
          className="rounded-3xl border border-error/20 bg-error-container p-space-md text-on-error-container"
        >
          <input type="hidden" name="resource_id" value={resource.id} />
          <input type="hidden" name="resource_slug" value={resource.slug} />
          <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-sm font-medium">Danger zone</p>
              <p className="text-label-sm text-on-error-container/80">
                Deleting removes this resource from marketing pages immediately.
              </p>
            </div>
            <Button type="submit" variant="destructive">
              Delete resource
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
