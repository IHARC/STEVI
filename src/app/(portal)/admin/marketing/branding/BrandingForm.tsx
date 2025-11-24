'use client';

import { useState, useTransition } from 'react';
import { Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { BrandingAssets } from '@/lib/marketing/settings';
import { saveBrandingSettings, uploadBrandingAsset } from './actions';

type Props = {
  branding?: BrandingAssets;
};

type BrandUploadProps = {
  label: string;
  description: string;
  value: string;
  onUpload: (file?: File | null) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function BrandingForm({ branding }: Props) {
  const [logoLightUrl, setLogoLightUrl] = useState(branding?.logoLightUrl ?? '');
  const [logoDarkUrl, setLogoDarkUrl] = useState(branding?.logoDarkUrl ?? '');
  const [faviconUrl, setFaviconUrl] = useState(branding?.faviconUrl ?? '');
  const [isUploading, startUpload] = useTransition();

  const handleBrandUpload = (kind: 'logo_light' | 'logo_dark' | 'favicon', file?: File | null) => {
    if (!file) return;
    startUpload(async () => {
      try {
        const data = new FormData();
        data.append('file', file);
        data.append('kind', kind);
        const result = await uploadBrandingAsset(data);
        if (result.kind === 'logo_light') setLogoLightUrl(result.url);
        if (result.kind === 'logo_dark') setLogoDarkUrl(result.url);
        if (result.kind === 'favicon') setFaviconUrl(result.url);
      } catch (error) {
        console.error(error);
        alert('Upload failed. Please try again or use a smaller file.');
      }
    });
  };

  return (
    <form action={saveBrandingSettings} className="space-y-space-lg">
      <input type="hidden" name="branding_logo_light_url" value={logoLightUrl} />
      <input type="hidden" name="branding_logo_dark_url" value={logoDarkUrl} />
      <input type="hidden" name="branding_favicon_url" value={faviconUrl} />

      <div className="grid gap-space-md md:grid-cols-3">
        <BrandUpload
          label="Logo (light mode)"
          description="Used on light surfaces; transparent PNG/SVG recommended."
          value={logoLightUrl}
          onClear={() => setLogoLightUrl('')}
          onUpload={(file) => handleBrandUpload('logo_light', file)}
          disabled={isUploading}
        />
        <BrandUpload
          label="Logo (dark mode)"
          description="Used on dark surfaces; transparent PNG/SVG recommended."
          value={logoDarkUrl}
          onClear={() => setLogoDarkUrl('')}
          onUpload={(file) => handleBrandUpload('logo_dark', file)}
          disabled={isUploading}
        />
        <BrandUpload
          label="Favicon"
          description="Square PNG/ICO/SVG, at least 64×64."
          value={faviconUrl}
          onClear={() => setFaviconUrl('')}
          onUpload={(file) => handleBrandUpload('favicon', file)}
          disabled={isUploading}
        />
      </div>

      <div className="space-y-space-sm rounded-lg border border-border bg-surface p-space-sm">
        <Label className="text-title-sm">Publishing notes</Label>
        <ul className="list-disc space-y-space-3xs pl-5 text-body-sm text-muted-foreground">
          <li>All assets publish immediately to the marketing site and STEVI metadata.</li>
          <li>Use final production files to avoid broken icons for visitors and outreach staff.</li>
          <li>Uploads replace the existing files; clear a slot if you need to remove an asset.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button type="submit" disabled={!logoLightUrl || !logoDarkUrl || !faviconUrl || isUploading}>
          Save branding
        </Button>
        <p className="text-body-sm text-muted-foreground">
          Logos and favicon drive navigation, app icon, and shared link previews.
        </p>
      </div>
    </form>
  );
}

function BrandUpload({ label, description, value, onUpload, onClear, disabled }: BrandUploadProps) {
  const uploadLabel = disabled ? 'Uploading…' : 'Upload';

  return (
    <div className="space-y-space-xs rounded-lg border border-border bg-surface p-space-sm">
      <div className="flex items-start justify-between gap-space-xs">
        <div className="space-y-space-3xs">
          <p className="text-title-sm">{label}</p>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-space-xs">
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-body-sm font-medium text-on-surface shadow-sm transition hover:bg-surface cursor-pointer">
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImageIcon className="h-4 w-4" aria-hidden />}
            {uploadLabel}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              disabled={disabled}
            />
          </label>
          {value ? (
            <Button type="button" variant="ghost" size="icon" onClick={onClear} aria-label={`Clear ${label}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-muted-foreground">No file selected</div>
        )}
      </div>
      {value ? <p className="text-body-xs text-muted-foreground break-all">{value}</p> : null}
    </div>
  );
}
