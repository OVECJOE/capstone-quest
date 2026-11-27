import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-28 py-3 w-full min-w-0 rounded-2xl border-3 border-ink bg-cream px-4 text-[17px] font-bold text-ink outline-none placeholder:font-medium placeholder:text-ink/50 focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
