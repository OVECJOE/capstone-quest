"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Collapsible } from "radix-ui"
import { buttonVariants } from "./button"

/** A button that shows and hides more. The content stays mounted, so typed answers survive. */
function Disclosure({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Collapsible.Root data-slot="disclosure" className={cn("flex w-full flex-col gap-3", className)}>
      <Collapsible.Trigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "group w-fit max-w-full text-left whitespace-normal")}>
        {label}
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180">
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Collapsible.Trigger>
      <Collapsible.Content forceMount className="data-[state=closed]:hidden">{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}

export { Disclosure }
