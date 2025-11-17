import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { getStateLayerClasses, type StateLayerTone } from "@/lib/state-layer"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-label-sm transition-colors motion-duration-short motion-ease-standard focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  stateLayerTone?: StateLayerTone | null
}

const BADGE_STATE_LAYER_DEFAULTS: Record<
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>,
  StateLayerTone | null
> = {
  default: "brand",
  secondary: "supportive",
  destructive: "destructive",
  outline: "neutral",
}

function Badge({ className, variant, stateLayerTone, ...props }: BadgeProps) {
  const resolvedVariant = variant ?? "default"
  const fallbackTone = BADGE_STATE_LAYER_DEFAULTS[resolvedVariant]
  const tone = stateLayerTone ?? fallbackTone
  const stateLayerClass = getStateLayerClasses(tone)
  return (
    <div className={cn(badgeVariants({ variant }), stateLayerClass, className)} {...props} />
  )
}

export { Badge, badgeVariants }
