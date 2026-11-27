"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { control } from "./control"

type Props = Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "min" | "max" | "type"> & {
  min: number
  max: number
  value?: string
  defaultValue?: number
  onValueChange?: (value: string) => void
}

const step = "grid w-12 shrink-0 cursor-pointer place-content-center rounded-xl border-3 border-ink bg-white font-display text-2xl leading-none font-bold shadow-[0_4px_0_var(--color-ink)] select-none hover:bg-lime active:translate-y-0.5 active:shadow-[0_2px_0_var(--color-ink)] disabled:pointer-events-none disabled:opacity-40"

/** A whole number with its own minus and plus buttons. Arrow keys work too. */
function NumberInput({ className, min, max, value, defaultValue, onValueChange, onKeyDown, disabled, ...props }: Props) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [own, setOwn] = React.useState(() => String(defaultValue ?? ""))
  const text = value ?? own
  const number = text === "" ? null : Number(text)

  const set = (next: string) => {
    setOwn(next)
    onValueChange?.(next)
  }
  const nudge = (by: number) => {
    const next = number === null ? (by > 0 ? min : max) : number + by
    set(String(Math.min(max, Math.max(min, next))))
  }

  // A text field has no range of its own, so tell the form when the number is outside it.
  React.useEffect(() => {
    const ok = number === null || (number >= min && number <= max)
    ref.current?.setCustomValidity(ok ? "" : `Enter a whole number from ${min} to ${max}.`)
  }, [number, min, max])

  return (
    <div data-slot="number-input" className={cn("flex w-full min-w-0 max-w-60 items-stretch gap-2", className)}>
      <button type="button" tabIndex={-1} aria-label="One less" className={step} disabled={disabled || (number !== null && number <= min)} onClick={() => nudge(-1)}>−</button>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={number ?? undefined}
        value={text}
        disabled={disabled}
        onChange={(event) => set(event.target.value.replace(/\D/g, "").slice(0, String(max).length))}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault()
            nudge(event.key === "ArrowUp" ? 1 : -1)
          }
          onKeyDown?.(event)
        }}
        className={cn(control, "min-h-14 flex-1 px-2 text-center font-display text-xl tabular-nums")}
        {...props}
      />
      <button type="button" tabIndex={-1} aria-label="One more" className={step} disabled={disabled || (number !== null && number >= max)} onClick={() => nudge(1)}>+</button>
    </div>
  )
}

export { NumberInput }
