"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type SplitAction = {
  label: string;
  href?: string;
  onSelect?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  ariaLabel?: string;
};

type SplitButtonProps = {
  primary: SplitAction;
  menuActions: SplitAction[];
  className?: string;
  size?: "sm" | "default" | "lg";
};

export function SplitButton({ primary, menuActions, className, size = "default" }: SplitButtonProps) {
  const router = useRouter();

  const primaryContent = (
    <span className="inline-flex items-center gap-space-2xs">
      {primary.icon ? <primary.icon className="h-4 w-4" aria-hidden /> : null}
      <span>{primary.label}</span>
    </span>
  );

  const primaryButton = primary.href ? (
    <Button asChild size={size} className="rounded-r-none border-r border-r-black/5">
      <Link href={primary.href} aria-label={primary.ariaLabel ?? primary.label}>
        {primaryContent}
      </Link>
    </Button>
  ) : (
    <Button size={size} onClick={primary.onSelect} className="rounded-r-none border-r border-r-black/5">
      {primaryContent}
    </Button>
  );

  return (
    <div className={cn("isolate inline-flex", className)}>
      {primaryButton}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size={size}
            aria-label="More actions"
            className="rounded-l-none px-space-sm"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px]">
          {menuActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onSelect={(event) => {
                event.preventDefault();
                if (action.onSelect) action.onSelect();
                if (action.href) router.push(action.href);
              }}
              className="flex items-start gap-space-sm py-space-sm"
            >
              <span className="mt-[2px] text-muted-foreground">
                {action.icon ? <action.icon className="h-4 w-4" aria-hidden /> : null}
              </span>
              <span className="flex flex-col">
                <span className="text-body-md font-medium text-on-surface">{action.label}</span>
                {action.description ? (
                  <span className="text-body-sm text-on-surface-variant">{action.description}</span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
