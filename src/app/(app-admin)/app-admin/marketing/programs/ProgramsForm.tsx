'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Form } from '@shared/ui/form';
import { Label } from '@shared/ui/label';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import type { ProgramEntry } from '@/lib/marketing/settings';
import { savePrograms } from './actions';

type Props = { programs: ProgramEntry[] };

type ProgramsFormValues = {
  programs_json: string;
};

export function ProgramsForm({ programs }: Props) {
  const [items, setItems] = useState<ProgramEntry[]>(programs);
  const form = useForm<ProgramsFormValues>({
    defaultValues: {
      programs_json: JSON.stringify(programs),
    },
  });

  const serialize = () => JSON.stringify(items);

  const updateItem = (index: number, field: keyof ProgramEntry, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { title: '', description: '' }]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  return (
    <Form {...form}>
      <form action={savePrograms} className="space-y-4">
        <input type="hidden" {...form.register('programs_json')} value={serialize()} />
        <div className="space-y-3">
          {items.map((program, index) => (
            <div key={`${program.title}-${index}`} className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`program-title-${index}`}>Title</Label>
                  <Input
                    id={`program-title-${index}`}
                    value={program.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove program ${program.title || index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`program-description-${index}`}>Description</Label>
                <Textarea
                  id={`program-description-${index}`}
                  value={program.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  required
                  rows={2}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Add program
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save programs</Button>
          <p className="text-sm text-muted-foreground">Changes publish to the marketing Programs page.</p>
        </div>
      </form>
    </Form>
  );
}
