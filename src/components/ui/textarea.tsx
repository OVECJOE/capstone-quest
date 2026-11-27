"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { control } from "./control"

/** Grows with its content in browsers that cannot do that from CSS alone. */
function grow(el: HTMLTextAreaElement) {
  if (CSS.supports("field-sizing", "content") || !el.offsetParent) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
}

function Textarea({ className, maxLength, value, defaultValue, onChange, ...props }: React.ComponentProps<"textarea">) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [typed, setTyped] = React.useState(() => String(defaultValue ?? "").length)
  const length = value === undefined ? typed : String(value).length

  // Watching the width also covers a field that was inside a hidden tab until now.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = -1
    const watcher = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== width) {
        width = entry.contentRect.width
        grow(el)
      }
    })
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])
  React.useEffect(() => {
    if (ref.current) grow(ref.current)
  }, [value])

  return (
    <div className="flex flex-col gap-1">
      <textarea
        ref={ref}
        data-slot="textarea"
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setTyped(event.target.value.length)
          grow(event.target)
          onChange?.(event)
        }}
        className={cn(control, "field-sizing-content max-h-[60vh] min-h-28 resize-none overflow-y-auto px-4 py-3", className)}
        {...props}
      />
      {maxLength ? (
        <span aria-hidden="true" className={cn("self-end rounded-full px-2 text-sm font-extrabold tabular-nums", length >= maxLength ? "bg-sun" : "text-ink/70")}>
          {length} / {maxLength}
        </span>
      ) : null}
    </div>
  )
}

export { Textarea }
