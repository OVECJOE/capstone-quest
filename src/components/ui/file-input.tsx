"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const size = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** A drop area for one file. The real field stays focusable, but only this design is seen. */
function FileInput({ className, prompt = "Drop a file here", onChange, ...props }: Omit<React.ComponentProps<"input">, "type" | "multiple"> & { prompt?: string }) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [over, setOver] = React.useState(false)

  return (
    <label
      data-slot="file-input"
      data-over={over || undefined}
      className={cn(
        "group relative flex cursor-pointer flex-wrap items-center gap-4 rounded-2xl border-3 border-dashed border-ink bg-cream p-4 transition-colors hover:bg-white data-over:bg-lime has-focus-visible:outline-4 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink has-aria-invalid:bg-blush has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault()
        if (!ref.current?.matches(":disabled")) setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const input = ref.current
        const dropped = event.dataTransfer.files[0]
        if (!input || input.matches(":disabled") || !dropped) return
        const holder = new DataTransfer()
        holder.items.add(dropped)
        input.files = holder.files
        setFile(dropped)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      }}
    >
      <input
        ref={ref}
        type="file"
        className="sr-only"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
          onChange?.(event)
        }}
        {...props}
      />
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="shrink-0 transition-transform group-hover:-translate-y-1 group-data-over:-translate-y-1">
        <rect x="4" y="6" width="44" height="44" rx="13" fill="var(--color-ink)" />
        <rect x="4" y="2" width="44" height="44" rx="13" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="3" />
        <path d={file ? "M16 25l7 7 14-15" : "M26 34V15M17 23l9-9 9 9"} fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-live="polite" className="flex min-w-0 flex-[1_1_160px] flex-col">
        <span className="font-display text-lg font-semibold break-all">{file ? file.name : prompt}</span>
        <span className="text-[15px] font-bold">{file ? size(file.size) : "or pick one from your device"}</span>
      </span>
      <span aria-hidden="true" className="rounded-xl border-3 border-ink bg-white px-4 py-1.5 font-display font-semibold shadow-[0_4px_0_var(--color-ink)] group-hover:bg-lime">
        {file ? "Change file" : "Choose file"}
      </span>
    </label>
  )
}

export { FileInput }
