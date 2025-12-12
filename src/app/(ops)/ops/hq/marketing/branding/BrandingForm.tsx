'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Form, FormField } from '@shared/ui/form';
import { useToast } from '@shared/ui/use-toast';
import type { BrandingAssets } from '@/lib/marketing/settings';
import { saveBrandingSettings, uploadBrandingAsset } from './actions';

type Props = {
  branding?: BrandingAssets;
};

type BrandingFormValues = {
  branding_logo_light_url: string;
  branding_logo_dark_url: string;
  branding_favicon_url: string;
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
  const { toast } = useToast();
  const [logoLightUrl, setLogoLightUrl] = useState(branding?.logoLightUrl ?? '');
  const [logoDarkUrl, setLogoDarkUrl] = useState(branding?.logoDarkUrl ?? '');
  const [faviconUrl, setFaviconUrl] = useState(branding?.faviconUrl ?? '');
  const [isUploading, startUpload] = useTransition();

  const form = useForm<BrandingFormValues>({
    defaultValues: {
      branding_logo_light_url: branding?.logoLightUrl ?? '',
      branding_logo_dark_url: branding?.logoDarkUrl ?? '',
      branding_favicon_url: branding?.faviconUrl ?? '',
    },
  });

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
        toast({
          title: 'Upload failed',
          variant: 'destructive',
          description: 'Please try again or use a smaller file.',
        });
      }
    });
  };

  useEffect(() => {
    form.setValue('branding_logo_light_url', logoLightUrl);
    form.setValue('branding_logo_dark_url', logoDarkUrl);
    form.setValue('branding_favicon_url', faviconUrl);
  }, [faviconUrl, form, logoDarkUrl, logoLightUrl]);

  return (
    <Form {...form}>
      <form action={saveBrandingSettings} className="space-y-6">
        <FormField
          control={form.control}
          name="branding_logo_light_url"
          render={() => <input type="hidden" name="branding_logo_light_url" value={logoLightUrl} />}
        />
        <FormField
          control={form.control}
          name="branding_logo_dark_url"
          render={() => <input type="hidden" name="branding_logo_dark_url" value={logoDarkUrl} />}
        />
        <FormField
          control={form.control}
          name="branding_favicon_url"
          render={() => <input type="hidden" name="branding_favicon_url" value={faviconUrl} />}
        />

        <div className="grid gap-4 md:grid-cols-3">
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

        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <p className="text-base font-medium">Publishing notes</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            <li>All assets publish immediately to the marketing site and STEVI metadata.</li>
            <li>Use final production files to avoid broken icons for visitors and outreach staff.</li>
            <li>Uploads replace the existing files; clear a slot if you need to remove an asset.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!logoLightUrl || !logoDarkUrl || !faviconUrl || isUploading}>
            Save branding
          </Button>
          <p className="text-sm text-muted-foreground">
            Logos and favicon drive navigation, app icon, and shared link previews.
          </p>
        </div>
      </form>
    </Form>
  );
}

function BrandUpload({ label, description, value, onUpload, onClear, disabled }: BrandUploadProps) {
  const uploadLabel = disabled ? 'Uploading…' : 'Upload';

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-base">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-background cursor-pointer">
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
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No file selected</div>
        )}
      </div>
      {value ? <p className="break-all text-xs text-muted-foreground">{value}</p> : null}
    </div>
  );
}
