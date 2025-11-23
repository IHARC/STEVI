'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NavItem } from '@/lib/marketing/settings';
import { saveNavigationSettings } from './actions';

type Props = {
  initialItems: NavItem[];
  portalCtaLabel: string;
};

function serialize(items: NavItem[]) {
  return JSON.stringify(items);
}

export function NavForm({ initialItems, portalCtaLabel }: Props) {
  const [items, setItems] = useState<NavItem[]>(initialItems);

  const updateItem = (index: number, field: keyof NavItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { label: '', href: '' }]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={saveNavigationSettings} className="space-y-space-md">
      <input type="hidden" name="items_json" value={serialize(items)} />
      <div className="space-y-space-sm">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="grid gap-space-xs rounded-lg border border-border bg-card/40 p-space-sm sm:grid-cols-[1fr,1fr,auto]"
          >
            <div className="space-y-space-2xs">
              <Label htmlFor={`label-${index}`}>Label</Label>
              <Input
                id={`label-${index}`}
                value={item.label}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-space-2xs">
              <Label htmlFor={`href-${index}`}>Href</Label>
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

      <div className="space-y-space-2xs">
        <Label htmlFor="portal_cta_label">Portal CTA label</Label>
        <Input
          id="portal_cta_label"
          name="portal_cta_label"
          defaultValue={portalCtaLabel}
          required
          maxLength={80}
        />
        <p className="text-body-xs text-muted-foreground">
          Text for the STEVI portal button shown on the public top nav.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button type="submit">Save navigation</Button>
        <p className="text-body-sm text-muted-foreground">Updates reflect on the public site immediately.</p>
      </div>
    </form>
  );
}
