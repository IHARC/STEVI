"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";

export type ToastVariant = "default" | "destructive";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
} & Omit<ExternalToast, "description">;

export function toast({ title, description, variant = "default", duration, ...rest }: ToastOptions) {
  const options = { description, duration, ...rest };
  if (variant === "destructive") {
    return sonnerToast.error(title, options);
  }
  return sonnerToast(title, options);
}

export function useToast() {
  return { toast };
}
