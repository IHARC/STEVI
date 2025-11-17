import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border border-outline bg-surface px-space-md py-space-sm text-body-md text-on-surface shadow-level-1 ring-offset-surface transition placeholder:text-on-surface-variant/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[invalid=true]:border-error file:border-0 file:bg-transparent file:text-label-sm file:font-medium file:text-on-surface disabled:cursor-not-allowed disabled:opacity-60 md:h-11",
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
