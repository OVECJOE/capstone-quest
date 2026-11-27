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

const tabsListVariants = cva("group/tabs-list relative min-w-0", {
  variants: {
    variant: {
      // The negative margin hides the room kept for focus rings and shadows.
      default: "-m-2",
      bar: "mx-auto mb-3 w-fit max-w-[92%] overflow-hidden rounded-3xl border-3 border-ink bg-white shadow-[0_6px_0_var(--color-ink)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

/** Reports which sides of a scrolling row hide more, and keeps the chosen tab in view. */
function useTabScroll() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState({ start: false, end: false })
  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    setMore((m) => (m.start === start && m.end === end ? m : { start, end }))
  }, [])

  React.useEffect(() => {
    const list = ref.current
    if (!list) return
    const reveal = (behavior: ScrollBehavior) => {
      const active = list.querySelector<HTMLElement>("[data-state=active]")
      if (!active) return
      const box = list.getBoundingClientRect()
      const tab = active.getBoundingClientRect()
      // Only the row moves. scrollIntoView would move the page as well.
      list.scrollBy({ left: tab.left + tab.width / 2 - (box.left + box.width / 2), behavior })
    }
    const glide = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth")
    // A change of size also covers a row that was inside a hidden panel until now.
    const sized = new ResizeObserver(() => {
      reveal("instant")
      measure()
    })
    sized.observe(list)
    const changed = new MutationObserver((records) => {
      if (records.some((r) => r.attributeName === "data-state")) reveal(glide())
      measure()
    })
    changed.observe(list, { subtree: true, childList: true, characterData: true, attributeFilter: ["data-state"] })
    return () => {
      sized.disconnect()
      changed.disconnect()
    }
  }, [measure])

  const page = (direction: 1 | -1) => {
    const el = ref.current
    el?.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" })
  }
  return { ref, more, measure, page }
}

/** A pointer shortcut. Keyboard users move along the tabs with the arrow keys. */
function ScrollButton({ side, shown, onClick }: { side: "start" | "end"; shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-slot="tabs-scroll"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 cursor-pointer place-content-center rounded-full border-3 border-ink bg-lime shadow-[0_3px_0_var(--color-ink)] transition-all duration-300 hover:bg-green",
        side === "start" ? "left-1" : "right-1",
        !shown && "pointer-events-none invisible scale-50 opacity-0",
        !shown && (side === "start" ? "-translate-x-4" : "translate-x-4")
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" className={side === "start" ? "rotate-180" : undefined}>
        <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const { ref, more, measure, page } = useTabScroll()
  return (
    <div data-slot="tabs-scroller" data-variant={variant} className={tabsListVariants({ variant })}>
      <TabsPrimitive.List
        ref={ref}
        data-slot="tabs-list"
        data-more-start={more.start || undefined}
        data-more-end={more.end || undefined}
        onScroll={measure}
        className={cn("flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain p-2", className)}
        {...props}
      />
      <ScrollButton side="start" shown={more.start} onClick={() => page(-1)} />
      <ScrollButton side="end" shown={more.end} onClick={() => page(1)} />
    </div>
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
        "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-3 border-ink px-3 py-1.5 font-display text-base font-semibold whitespace-nowrap text-ink outline-none hover:bg-lime sm:px-4 focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink data-[state=active]:bg-ink data-[state=active]:text-cream group-data-[variant=bar]/tabs-list:border-transparent",
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
