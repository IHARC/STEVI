"use client";

import { useSyncExternalStore } from "react";

export type ToastVariant = "default" | "destructive";
export type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  open: boolean;
};

const DEFAULT_DURATION = 4000;
const EXIT_DELAY = 180;
const TOAST_LIMIT = 4;

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const getSnapshot = () => toasts;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const removeToast = (id: string) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
};

export const dismissToast = (id: string) => {
  const target = toasts.find((toast) => toast.id === id);
  if (!target || !target.open) return;
  toasts = toasts.map((toast) => (toast.id === id ? { ...toast, open: false } : toast));
  notify();
  setTimeout(() => removeToast(id), EXIT_DELAY);
};

export const toast = ({ title, description, variant = "default", duration }: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = createId();
  const entry: ToastRecord = {
    id,
    title,
    description,
    variant,
    duration: duration ?? DEFAULT_DURATION,
    open: true,
  };

  toasts = [entry, ...toasts].slice(0, TOAST_LIMIT);
  notify();

  if (entry.duration > 0) {
    setTimeout(() => dismissToast(id), entry.duration);
  }

  return id;
};

export function useToastState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useToast() {
  return { toast };
}
