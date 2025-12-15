'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@shared/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string;
};

type ComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches.',
  disabled,
  className,
  buttonClassName,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label ?? '', [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', buttonClassName)}
        >
          <span className={cn('min-w-0 truncate text-left', selectedLabel ? 'text-foreground' : 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-[--radix-popover-trigger-width] p-0', className)}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value || option.label}
                  value={`${option.label} ${option.keywords ?? ''}`.trim()}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', option.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

