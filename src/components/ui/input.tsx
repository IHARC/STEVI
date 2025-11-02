import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[var(--md-sys-shape-corner-small)] border border-outline bg-surface px-4 py-3 text-base text-on-surface shadow-sm ring-offset-surface transition placeholder:text-on-surface-variant/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[invalid=true]:border-error file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-on-surface disabled:cursor-not-allowed disabled:opacity-60 md:h-11 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
