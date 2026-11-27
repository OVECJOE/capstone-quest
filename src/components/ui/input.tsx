import * as React from "react"
import { cn } from "@/lib/utils"
import { control } from "./control"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(control, "min-h-14 px-4 read-only:cursor-text", className)}
      {...props}
    />
  )
}

export { Input }
