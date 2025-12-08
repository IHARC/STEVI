'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import type { ContextCard, HeroContent } from '@/lib/marketing/settings';
import { saveHomeSettings, uploadHeroImage } from './actions';

type Props = {
  hero: HeroContent;
  contextCards: ContextCard[];
};

type HomeFormValues = {
  hero_image_url: string;
  context_cards_json: string;
  hero_pill: string;
  hero_headline: string;
  hero_body: string;
  hero_supporting: string;
  hero_image_alt: string;
  hero_primary_label: string;
  hero_primary_href: string;
  hero_secondary_label: string;
  hero_secondary_href: string;
};

function serializeContext(cards: ContextCard[]) {
  return JSON.stringify(cards);
}

export function HomeForm({ hero, contextCards }: Props) {
  const [cards, setCards] = useState<ContextCard[]>(contextCards);
  const [heroImageUrl, setHeroImageUrl] = useState(hero.imageUrl ?? '');
  const [isUploading, startUpload] = useTransition();

  const form = useForm<HomeFormValues>({
    defaultValues: {
      hero_image_url: hero.imageUrl ?? '',
      context_cards_json: serializeContext(contextCards),
      hero_pill: hero.pill,
      hero_headline: hero.headline,
      hero_body: hero.body,
      hero_supporting: hero.supporting,
      hero_image_alt: hero.imageAlt ?? '',
      hero_primary_label: hero.primaryCta.label,
      hero_primary_href: hero.primaryCta.href,
      hero_secondary_label: hero.secondaryLink?.label ?? '',
      hero_secondary_href: hero.secondaryLink?.href ?? '',
    },
  });

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

  useEffect(() => {
    form.setValue('hero_image_url', heroImageUrl);
  }, [form, heroImageUrl]);

  useEffect(() => {
    form.setValue('context_cards_json', serializeContext(cards));
  }, [cards, form]);

  return (
    <Form {...form}>
      <form action={saveHomeSettings} className="space-y-6">
        <input type="hidden" {...form.register('hero_image_url')} value={heroImageUrl} />
        <input type="hidden" {...form.register('context_cards_json')} value={serializeContext(cards)} />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hero_pill"
            rules={{ required: 'Pill label is required' }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_pill">Pill label</FormLabel>
                <FormControl>
                  <Input id="hero_pill" required maxLength={120} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hero_headline"
            rules={{ required: 'Headline is required' }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_headline">Headline</FormLabel>
                <FormControl>
                  <Input id="hero_headline" required maxLength={200} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="hero_body"
          rules={{ required: 'Body is required' }}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel htmlFor="hero_body">Body</FormLabel>
              <FormControl>
                <Textarea id="hero_body" required rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hero_supporting"
          rules={{ required: 'Supporting line is required' }}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel htmlFor="hero_supporting">Supporting line</FormLabel>
              <FormControl>
                <Textarea id="hero_supporting" required rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <FormField
            control={form.control}
            name="hero_image_alt"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_image_alt">Hero image alt text</FormLabel>
                <FormControl>
                  <Input
                    id="hero_image_alt"
                    placeholder="Describe the photo for people using screen readers"
                    maxLength={200}
                    {...field}
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground">
                  Required if an image is present. Keep it concise and specific.
                </p>
              </FormItem>
            )}
          />
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-base">Hero image</p>
                <p className="text-sm text-muted-foreground">JPEG/PNG, up to 5 MB. Stored in app-branding bucket.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-background">
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
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image selected</div>
              )}
            </div>
            {heroImageUrl ? (
              <p className="break-all text-xs text-muted-foreground">{heroImageUrl}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hero_primary_label"
            rules={{ required: 'Primary CTA label required' }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_primary_label">Primary CTA label</FormLabel>
                <FormControl>
                  <Input id="hero_primary_label" required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hero_primary_href"
            rules={{ required: 'Primary CTA href required' }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_primary_href">Primary CTA href</FormLabel>
                <FormControl>
                  <Input id="hero_primary_href" required placeholder="/get-help" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hero_secondary_label"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_secondary_label">Secondary link label</FormLabel>
                <FormControl>
                  <Input id="hero_secondary_label" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hero_secondary_href"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel htmlFor="hero_secondary_href">Secondary link href</FormLabel>
                <FormControl>
                  <Input id="hero_secondary_href" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg">Context cards</p>
              <p className="text-sm text-muted-foreground">Shown under “How we got here”.</p>
            </div>
            <Button type="button" variant="outline" onClick={addCard} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              Add card
            </Button>
          </div>

          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={`${card.id || 'card'}-${index}`}
                className="grid gap-2 rounded-lg border border-border bg-card/40 p-3 md:grid-cols-[1fr,1fr]"
              >
                <div className="space-y-1">
                  <FormLabel htmlFor={`card-id-${index}`}>ID / anchor</FormLabel>
                  <Input
                    id={`card-id-${index}`}
                    value={card.id}
                    onChange={(e) => updateCard(index, 'id', e.target.value)}
                    required
                    placeholder="housing"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel htmlFor={`card-title-${index}`}>Title</FormLabel>
                  <Input
                    id={`card-title-${index}`}
                    value={card.title}
                    onChange={(e) => updateCard(index, 'title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <FormLabel htmlFor={`card-description-${index}`}>Description</FormLabel>
                  <Textarea
                    id={`card-description-${index}`}
                    value={card.description}
                    onChange={(e) => updateCard(index, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel htmlFor={`card-href-${index}`}>Href</FormLabel>
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save home & context</Button>
          <p className="text-sm text-muted-foreground">Saves publish to the public site immediately.</p>
        </div>
      </form>
    </Form>
  );
}
