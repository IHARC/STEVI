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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={activeFilter === filter.id ? "secondary" : "outline"}
            onClick={() => setActiveFilter(filter.id)}
            className="rounded-full px-4"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border/30 bg-card px-4 py-4 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-muted px-4 py-3 shadow-sm transition-colors hover:bg-card"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.description ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={item.tone === "warning" ? "secondary" : "outline"}
                  className={cn(
                    item.tone === "warning"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border/30 text-muted-foreground",
                  )}
                >
                  {item.count.toLocaleString("en-CA")}
                </Badge>
                <Button asChild variant="ghost" size="sm" className="text-xs">
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
