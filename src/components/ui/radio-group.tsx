"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "min-h-12 cursor-pointer rounded-2xl border-3 border-ink bg-cream px-4 py-2 text-left font-extrabold text-ink outline-none focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-lime data-[state=checked]:shadow-[0_5px_0_var(--color-ink)]",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
