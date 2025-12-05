"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AttentionQueueItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  description?: string;
  tone?: "default" | "warning";
  assignedToCurrentUser?: boolean;
};

const FILTERS = [
  { id: "needs", label: "Needs review" },
  { id: "all", label: "All" },
  { id: "mine", label: "My items" },
];

type AttentionQueueProps = {
  items: AttentionQueueItem[];
};

export function AttentionQueue({ items }: AttentionQueueProps) {
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]["id"]>("needs");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "mine") return items.filter((item) => item.assignedToCurrentUser);
    return items.filter((item) => item.count > 0);
  }, [activeFilter, items]);

  const emptyMessage =
    activeFilter === "mine"
      ? "Nothing is assigned to you right now."
      : "No items need attention."

  return (
    <div className="space-y-space-sm">
      <div className="flex flex-wrap items-center gap-space-2xs">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={activeFilter === filter.id ? "secondary" : "outline"}
            onClick={() => setActiveFilter(filter.id)}
            className="rounded-full px-space-md"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="space-y-space-xs">
        {filtered.length === 0 ? (
          <div className="rounded-[var(--md-sys-shape-corner-small)] border border-outline/12 bg-surface-container px-space-md py-space-md text-body-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-space-sm rounded-[var(--md-sys-shape-corner-small)] border border-outline/10 bg-surface-container-low px-space-md py-space-sm shadow-level-1 transition-colors hover:bg-surface-container"
            >
              <div className="space-y-space-3xs">
                <p className="text-body-md font-medium text-on-surface">{item.label}</p>
                {item.description ? (
                  <p className="text-label-sm text-on-surface-variant">{item.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-space-sm">
                <Badge
                  variant={item.tone === "warning" ? "secondary" : "outline"}
                  className={cn(
                    item.tone === "warning"
                      ? "border-primary/20 bg-primary-container text-on-primary-container"
                      : "border-outline/30 text-on-surface-variant",
                  )}
                >
                  {item.count.toLocaleString("en-CA")}
                </Badge>
                <Button asChild variant="ghost" size="sm" className="text-label-sm">
                  <Link href={item.href}>Review all</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
