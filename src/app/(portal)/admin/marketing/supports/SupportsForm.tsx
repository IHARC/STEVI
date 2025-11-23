'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SupportContact, SupportEntry } from '@/lib/marketing/settings';
import { saveSupports } from './actions';

type Props = {
  urgent: SupportEntry[];
  mutualAid: string[];
};

function serialize(urgent: SupportEntry[], mutualAid: string[]) {
  return {
    urgent: JSON.stringify(urgent),
    mutualAid: JSON.stringify(mutualAid),
  };
}

export function SupportsForm({ urgent, mutualAid }: Props) {
  const [urgentSupports, setUrgentSupports] = useState<SupportEntry[]>(urgent);
  const [mutualAidItems, setMutualAidItems] = useState<string[]>(mutualAid);

  const serialized = useMemo(() => serialize(urgentSupports, mutualAidItems), [urgentSupports, mutualAidItems]);

  const updateSupport = (index: number, field: keyof SupportEntry, value: string) => {
    setUrgentSupports((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateContact = (supportIndex: number, contactIndex: number, field: keyof SupportContact, value: string) => {
    setUrgentSupports((prev) =>
      prev.map((item, i) => {
        if (i !== supportIndex) return item;
        const contacts = item.contacts ?? [];
        const next = contacts.map((contact, ci) => (ci === contactIndex ? { ...contact, [field]: value } : contact));
        return { ...item, contacts: next };
      }),
    );
  };

  const addSupport = () =>
    setUrgentSupports((prev) => [
      ...prev,
      { title: '', summary: '', body: '', contacts: [{ label: '', href: '' }] },
    ]);

  const removeSupport = (index: number) => setUrgentSupports((prev) => prev.filter((_, i) => i !== index));

  const addContact = (index: number) =>
    setUrgentSupports((prev) =>
      prev.map((item, i) => (i === index ? { ...item, contacts: [...(item.contacts ?? []), { label: '', href: '' }] } : item)),
    );

  const removeContact = (supportIndex: number, contactIndex: number) =>
    setUrgentSupports((prev) =>
      prev.map((item, i) => {
        if (i !== supportIndex) return item;
        const contacts = (item.contacts ?? []).filter((_, ci) => ci !== contactIndex);
        return { ...item, contacts };
      }),
    );

  const addMutualAid = () => setMutualAidItems((prev) => [...prev, '']);
  const updateMutualAid = (index: number, value: string) =>
    setMutualAidItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  const removeMutualAid = (index: number) => setMutualAidItems((prev) => prev.filter((_, i) => i !== index));

  return (
    <form action={saveSupports} className="space-y-space-lg">
      <input type="hidden" name="urgent_supports_json" value={serialized.urgent} />
      <input type="hidden" name="mutual_aid_json" value={serialized.mutualAid} />

      <div className="space-y-space-sm">
        {urgentSupports.map((support, index) => (
          <div key={`${support.title}-${index}`} className="space-y-space-sm rounded-xl border border-border bg-card/40 p-space-md">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="space-y-space-2xs flex-1">
                <Label htmlFor={`title-${index}`}>Title</Label>
                <Input
                  id={`title-${index}`}
                  value={support.title}
                  onChange={(e) => updateSupport(index, 'title', e.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => removeSupport(index)}
                aria-label={`Remove support ${support.title || index + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="space-y-space-2xs">
              <Label htmlFor={`summary-${index}`}>Summary</Label>
              <Textarea
                id={`summary-${index}`}
                value={support.summary}
                onChange={(e) => updateSupport(index, 'summary', e.target.value)}
                required
                rows={2}
              />
            </div>
            <div className="space-y-space-2xs">
              <Label htmlFor={`body-${index}`}>Body</Label>
              <Textarea
                id={`body-${index}`}
                value={support.body}
                onChange={(e) => updateSupport(index, 'body', e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="space-y-space-2xs">
              <div className="flex items-center justify-between">
                <Label>Contacts</Label>
                <Button type="button" variant="ghost" onClick={() => addContact(index)} className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add contact
                </Button>
              </div>
              <div className="space-y-space-xs">
                {(support.contacts ?? []).map((contact, contactIndex) => (
                  <div key={`${contact.label}-${contactIndex}`} className="grid gap-space-xs md:grid-cols-[1fr,1fr,auto]">
                    <Input
                      placeholder="Label (e.g., Dial 2-1-1)"
                      value={contact.label}
                      onChange={(e) => updateContact(index, contactIndex, 'label', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Href (e.g., tel:211 or https://...)"
                      value={contact.href ?? ''}
                      onChange={(e) => updateContact(index, contactIndex, 'href', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeContact(index, contactIndex)}
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addSupport} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add support entry
        </Button>
      </div>

      <div className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-title-md">Mutual aid notes</p>
            <p className="text-body-sm text-muted-foreground">Shown as a list beneath urgent supports.</p>
          </div>
          <Button type="button" variant="outline" onClick={addMutualAid} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Add item
          </Button>
        </div>
        <div className="space-y-space-xs">
          {mutualAidItems.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-space-xs">
              <Input
                value={item}
                onChange={(e) => updateMutualAid(index, e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => removeMutualAid(index)}
                aria-label="Remove mutual aid item"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button type="submit">Save supports</Button>
        <p className="text-body-sm text-muted-foreground">Changes appear on the public site immediately.</p>
      </div>
    </form>
  );
}
