'use client';

import { useState, useTransition } from 'react';
import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContextCard, HeroContent } from '@/lib/marketing/settings';
import { saveHomeSettings, uploadHeroImage } from './actions';

type Props = {
  hero: HeroContent;
  contextCards: ContextCard[];
};

function serializeContext(cards: ContextCard[]) {
  return JSON.stringify(cards);
}

export function HomeForm({ hero, contextCards }: Props) {
  const [cards, setCards] = useState<ContextCard[]>(contextCards);
  const [heroImageUrl, setHeroImageUrl] = useState(hero.imageUrl ?? '');
  const [isUploading, startUpload] = useTransition();

  const updateCard = (index: number, field: keyof ContextCard, value: string) => {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  };

  const addCard = () =>
    setCards((prev) => [...prev, { id: '', title: '', description: '', href: '/context#' }]);

  const removeCard = (index: number) => setCards((prev) => prev.filter((_, i) => i !== index));

  const handleImageUpload = (file?: File | null) => {
    if (!file) return;
    startUpload(async () => {
      try {
        const data = new FormData();
        data.append('file', file);
        const result = await uploadHeroImage(data);
        setHeroImageUrl(result.url);
      } catch (error) {
        console.error(error);
        alert('Upload failed. Please try again or use a smaller image.');
      }
    });
  };

  return (
    <form action={saveHomeSettings} className="space-y-space-lg">
      <input type="hidden" name="hero_image_url" value={heroImageUrl} />
      <input type="hidden" name="context_cards_json" value={serializeContext(cards)} />
      <div className="grid gap-space-md md:grid-cols-2">
        <div className="space-y-space-sm">
          <Label htmlFor="hero_pill">Pill label</Label>
          <Input id="hero_pill" name="hero_pill" defaultValue={hero.pill} required maxLength={120} />
        </div>
        <div className="space-y-space-sm">
          <Label htmlFor="hero_headline">Headline</Label>
          <Input id="hero_headline" name="hero_headline" defaultValue={hero.headline} required maxLength={200} />
        </div>
      </div>
      <div className="space-y-space-sm">
        <Label htmlFor="hero_body">Body</Label>
        <Textarea id="hero_body" name="hero_body" defaultValue={hero.body} required rows={3} />
      </div>
      <div className="space-y-space-sm">
        <Label htmlFor="hero_supporting">Supporting line</Label>
        <Textarea
          id="hero_supporting"
          name="hero_supporting"
          defaultValue={hero.supporting}
          required
          rows={2}
        />
      </div>
      <div className="grid gap-space-md md:grid-cols-[2fr,1fr]">
        <div className="space-y-space-sm">
          <Label htmlFor="hero_image_alt">Hero image alt text</Label>
          <Input
            id="hero_image_alt"
            name="hero_image_alt"
            defaultValue={hero.imageAlt ?? ''}
            placeholder="Describe the photo for people using screen readers"
            maxLength={200}
          />
          <p className="text-body-sm text-muted-foreground">
            Required if an image is present. Keep it concise and specific.
          </p>
        </div>
        <div className="space-y-space-xs rounded-lg border border-border bg-surface p-space-sm">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="space-y-space-2xs">
              <p className="text-title-sm">Hero image</p>
              <p className="text-body-sm text-muted-foreground">JPEG/PNG, up to 5 MB. Stored in app-branding bucket.</p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-body-sm font-medium text-on-surface shadow-sm transition hover:bg-surface cursor-pointer">
              <ImageIcon className="h-4 w-4" aria-hidden />
              {isUploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
                disabled={isUploading}
              />
            </label>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Uploading image…</span>
              </div>
            ) : heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImageUrl} alt={hero.imageAlt ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-body-sm text-muted-foreground">No image selected</div>
            )}
          </div>
          {heroImageUrl ? (
            <p className="text-body-xs text-muted-foreground break-all">{heroImageUrl}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-space-md md:grid-cols-2">
        <div className="space-y-space-sm">
          <Label htmlFor="hero_primary_label">Primary CTA label</Label>
          <Input
            id="hero_primary_label"
            name="hero_primary_label"
            defaultValue={hero.primaryCta.label}
            required
          />
        </div>
        <div className="space-y-space-sm">
          <Label htmlFor="hero_primary_href">Primary CTA href</Label>
          <Input
            id="hero_primary_href"
            name="hero_primary_href"
            defaultValue={hero.primaryCta.href}
            required
            placeholder="/get-help"
          />
        </div>
      </div>
      <div className="grid gap-space-md md:grid-cols-2">
        <div className="space-y-space-sm">
          <Label htmlFor="hero_secondary_label">Secondary link label</Label>
          <Input id="hero_secondary_label" name="hero_secondary_label" defaultValue={hero.secondaryLink?.label ?? ''} />
        </div>
        <div className="space-y-space-sm">
          <Label htmlFor="hero_secondary_href">Secondary link href</Label>
          <Input id="hero_secondary_href" name="hero_secondary_href" defaultValue={hero.secondaryLink?.href ?? ''} />
        </div>
      </div>

      <div className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-title-md">Context cards</p>
            <p className="text-body-sm text-muted-foreground">Shown under “How we got here”.</p>
          </div>
          <Button type="button" variant="outline" onClick={addCard} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Add card
          </Button>
        </div>

        <div className="space-y-space-sm">
          {cards.map((card, index) => (
            <div
              key={`${card.id || 'card'}-${index}`}
              className="grid gap-space-xs rounded-lg border border-border bg-card/40 p-space-sm md:grid-cols-[1fr,1fr]"
            >
              <div className="space-y-space-2xs">
                <Label htmlFor={`card-id-${index}`}>ID / anchor</Label>
                <Input
                  id={`card-id-${index}`}
                  value={card.id}
                  onChange={(e) => updateCard(index, 'id', e.target.value)}
                  required
                  placeholder="housing"
                />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor={`card-title-${index}`}>Title</Label>
                <Input
                  id={`card-title-${index}`}
                  value={card.title}
                  onChange={(e) => updateCard(index, 'title', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-space-2xs md:col-span-2">
                <Label htmlFor={`card-description-${index}`}>Description</Label>
                <Textarea
                  id={`card-description-${index}`}
                  value={card.description}
                  onChange={(e) => updateCard(index, 'description', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor={`card-href-${index}`}>Href</Label>
                <Input
                  id={`card-href-${index}`}
                  value={card.href}
                  onChange={(e) => updateCard(index, 'href', e.target.value)}
                  required
                  placeholder="/context#housing"
                />
              </div>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeCard(index)}
                  aria-label={`Remove ${card.title || 'context card'}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button type="submit">Save home & context</Button>
        <p className="text-body-sm text-muted-foreground">Saves publish to the public site immediately.</p>
      </div>
    </form>
  );
}
