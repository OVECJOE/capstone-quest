"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex flex-col gap-4",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva("group/tabs-list flex flex-wrap items-center gap-2", {
  variants: {
    variant: {
      default: "",
      bar: "mx-auto mb-3 w-fit max-w-[92%] justify-center rounded-3xl border-3 border-ink bg-white p-2 shadow-[0_6px_0_var(--color-ink)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-3 border-ink px-4 py-1.5 font-display text-base font-semibold whitespace-nowrap text-ink outline-none hover:bg-lime focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink data-[state=active]:bg-ink data-[state=active]:text-cream group-data-[variant=bar]/tabs-list:border-transparent",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      forceMount
      // Panels stay mounted so half-written answers survive a look at another tab.
      className={cn("flex flex-col gap-4 outline-none data-[state=inactive]:hidden", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
