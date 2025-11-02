'use client'

import { toast as sonnerToast } from 'sonner'

export type ToastVariant = 'default' | 'destructive'

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export function toast({ title, description, variant = 'default', duration }: ToastOptions) {
  const options = {
    description,
    duration,
  } as const

  if (variant === 'destructive') {
    return sonnerToast.error(title, options)
  }

  return sonnerToast(title, options)
}

export function useToast() {
  return { toast }
}
