import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { getStateLayerClasses } from "@/lib/state-layer"

const navStateLayer = {
  primary: `${getStateLayerClasses("primary")} hover:text-primary`,
  brand: `${getStateLayerClasses("primary")} hover:text-brand`,
  inverse: `${getStateLayerClasses("inverse")} hover:text-inverse-on-surface`,
}

const navPillVariants = cva(
  "inline-flex items-center gap-space-2xs rounded-full text-label-md font-medium transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  {
    variants: {
      size: {
        md: "px-space-md py-space-2xs",
        lg: "px-space-lg py-space-xs text-body-md",
      },
      tone: {
        primary: "text-on-surface/80",
        brand: "text-on-surface/80",
        inverse: "text-inverse-on-surface/80",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        tone: "primary",
        active: true,
        className: "bg-primary text-on-primary shadow-level-1",
      },
      {
        tone: "brand",
        active: true,
        className: "bg-brand-soft text-brand shadow-level-1",
      },
      {
        tone: "inverse",
        active: true,
        className: "bg-inverse-surface text-inverse-on-surface shadow-level-1",
      },
      {
        tone: "primary",
        active: false,
        className: navStateLayer.primary,
      },
      {
        tone: "brand",
        active: false,
        className: navStateLayer.brand,
      },
      {
        tone: "inverse",
        active: false,
        className: navStateLayer.inverse,
      },
    ],
    defaultVariants: {
      tone: "primary",
      size: "md",
      active: false,
    },
  },
)

export interface NavPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof navPillVariants> {
  asChild?: boolean
}

export const NavPill = React.forwardRef<HTMLButtonElement, NavPillProps>(
  ({ className, tone, active, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(navPillVariants({ tone, active, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
NavPill.displayName = "NavPill"

export { navPillVariants }
