import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground  disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50  md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
