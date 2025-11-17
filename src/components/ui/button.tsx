import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { getStateLayerClasses, type StateLayerTone } from "@/lib/state-layer"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-space-xs whitespace-nowrap rounded-full text-label-lg transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-level-2 hover:bg-primary/92 focus-visible:ring-primary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-level-2 hover:bg-destructive/90 focus-visible:ring-destructive",
        outline:
          "border border-outline bg-surface text-on-surface shadow-level-1 hover:bg-surface-container focus-visible:ring-primary",
        secondary:
          "bg-secondary-container text-on-secondary-container shadow-level-1 hover:bg-secondary-container/90 focus-visible:ring-secondary",
        ghost:
          "text-primary focus-visible:ring-primary",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-transparent",
      },
      size: {
        default: "h-10 px-space-lg",
        sm: "h-9 px-space-md text-label-md",
        lg: "h-12 px-space-xl text-label-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  stateLayerTone?: StateLayerTone | null
}

const BUTTON_STATE_LAYER_DEFAULTS: Record<
  NonNullable<VariantProps<typeof buttonVariants>["variant"]>,
  StateLayerTone | null
> = {
  default: "brand",
  destructive: "destructive",
  outline: "neutral",
  secondary: "supportive-container",
  ghost: "brand",
  link: null,
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, stateLayerTone, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedVariant = variant ?? "default"
    const fallbackTone = BUTTON_STATE_LAYER_DEFAULTS[resolvedVariant]
    const tone = stateLayerTone ?? fallbackTone
    const stateLayerClass = getStateLayerClasses(tone)
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), stateLayerClass, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
