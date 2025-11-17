import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ICON_SIZE_MAP = {
  indicator: "var(--md-sys-spacing-xs)",
  control: "calc(var(--md-sys-spacing-sm) - (var(--md-sys-spacing-2xs)/2))",
  xs: "var(--md-sys-size-icon-xs)",
  sm: "var(--md-sys-size-icon-sm)",
  md: "var(--md-sys-size-icon-md)",
  lg: "var(--md-sys-size-icon-lg)",
} as const

export type IconSize = keyof typeof ICON_SIZE_MAP

export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> {
  icon: LucideIcon
  size?: IconSize
  strokeWidth?: number
  decorative?: boolean
}

export const Icon = React.forwardRef<React.ElementRef<"svg">, IconProps>(
  (
    {
      icon: IconPrimitive,
      className,
      size = "md",
      strokeWidth = 1.5,
      decorative = true,
      style,
      ...props
    },
    ref,
  ) => {
    const dimension = ICON_SIZE_MAP[size] ?? ICON_SIZE_MAP.md
    return (
      <IconPrimitive
        ref={ref}
        aria-hidden={decorative ? true : undefined}
        role={decorative ? undefined : "img"}
        focusable="false"
        className={cn("shrink-0 text-inherit", className)}
        style={{ width: dimension, height: dimension, ...style }}
        strokeWidth={strokeWidth}
        {...props}
      />
    )
  },
)

Icon.displayName = "Icon"
