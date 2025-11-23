import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_NAME = 'IHARC Portal';
export const DEFAULT_TIMEZONE = 'America/Toronto';

export function sanitizeFileName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, '-');
  return normalized.replace(/[^a-z0-9._-]/g, '') || 'file';
}
