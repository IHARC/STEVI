import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--md-sys-shape-corner-small)] text-label-md font-semibold text-on-surface-variant transition-colors motion-duration-short motion-ease-standard ring-offset-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-secondary-container data-[state=on]:text-on-secondary-container",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-surface-container",
        outline:
          "border border-outline/40 bg-surface-container-low hover:bg-surface-container",
      },
      size: {
        default: "h-10 px-space-sm",
        sm: "h-9 px-space-sm",
        lg: "h-11 px-space-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
