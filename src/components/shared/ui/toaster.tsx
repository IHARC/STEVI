"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { dismissToast, useToastState, type ToastPosition, type ToastVariant } from "@/hooks/use-toast";

type ToasterProps = {
  position?: ToastPosition;
  closeButton?: boolean;
};

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-left": "left-4 top-4 items-start",
  "top-right": "right-4 top-4 items-end",
  "bottom-left": "left-4 bottom-4 items-start",
  "bottom-right": "right-4 bottom-4 items-end",
  "top-center": "left-1/2 top-4 -translate-x-1/2 items-center",
  "bottom-center": "left-1/2 bottom-4 -translate-x-1/2 items-center",
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: "border-border/60 bg-background text-foreground",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function Toaster({ position = "top-right", closeButton = true }: ToasterProps) {
  const toasts = useToastState();
  const positionClass = POSITION_CLASSES[position];
  const isCenter = position.includes("center");

  const containerClassName = useMemo(
    () =>
      cn(
        "pointer-events-none fixed z-[1000] flex w-full max-w-sm flex-col gap-3",
        positionClass,
        isCenter ? "items-center" : null,
      ),
    [positionClass, isCenter],
  );

  return (
    <div
      className={containerClassName}
      role="region"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto w-full rounded-xl border px-4 py-3 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-3",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-3",
            VARIANT_CLASSES[toast.variant],
          )}
          data-state={toast.open ? "open" : "closed"}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="text-sm text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
            {closeButton ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
