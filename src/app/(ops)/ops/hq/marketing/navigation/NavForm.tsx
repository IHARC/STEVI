'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import type { NavItem } from '@/lib/marketing/settings';
import { saveNavigationSettings } from './actions';

type Props = {
  initialItems: NavItem[];
  portalCtaLabel: string;
};

type NavFormValues = {
  items_json: string;
  portal_cta_label: string;
};

function serialize(items: NavItem[]) {
  return JSON.stringify(items);
}

export function NavForm({ initialItems, portalCtaLabel }: Props) {
  const [items, setItems] = useState<NavItem[]>(initialItems);
  const form = useForm<NavFormValues>({
    defaultValues: {
      items_json: serialize(initialItems),
      portal_cta_label: portalCtaLabel,
    },
  });

  const updateItem = (index: number, field: keyof NavItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { label: '', href: '' }]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    form.setValue('items_json', serialize(items));
  }, [form, items]);

  return (
    <Form {...form}>
      <form action={saveNavigationSettings} className="space-y-4">
        <input type="hidden" {...form.register('items_json')} value={serialize(items)} />
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="grid gap-2 rounded-lg border border-border bg-card/40 p-3 sm:grid-cols-[1fr,1fr,auto]"
            >
              <div className="space-y-1">
                <FormLabel htmlFor={`label-${index}`}>Label</FormLabel>
                <Input
                  id={`label-${index}`}
                  value={item.label}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  required
                  maxLength={80}
                />
              </div>
              <div className="space-y-1">
                <FormLabel htmlFor={`href-${index}`}>Href</FormLabel>
                <Input
                  id={`href-${index}`}
                  value={item.href}
                  onChange={(e) => updateItem(index, 'href', e.target.value)}
                  required
                  placeholder="/about"
                />
              </div>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove ${item.label || 'nav item'}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Add link
          </Button>
        </div>

        <FormField
          control={form.control}
          name="portal_cta_label"
          rules={{ required: 'Portal CTA label is required' }}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel htmlFor="portal_cta_label">Portal CTA label</FormLabel>
              <FormControl>
                <Input
                  id="portal_cta_label"
                  required
                  maxLength={80}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Text for the STEVI portal button shown on the public top nav.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save navigation</Button>
          <p className="text-sm text-muted-foreground">Updates reflect on the public site immediately.</p>
        </div>
      </form>
    </Form>
  );
}
