"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog } from "radix-ui"
import { addDays, addMonths, calendarDays, combine, sameDay } from "@/lib/calendar"
import { Button } from "./button"
import { control } from "./control"
import { Label } from "./label"
import { NumberInput } from "./number-input"

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", options).format(date)
const pad = (n: number) => String(n).padStart(2, "0")
const subscribe = () => () => {}

type Draft = { day: Date | null; hour: string; minute: string }
const toDraft = (iso: string | null): Draft => {
  if (!iso) return { day: null, hour: "23", minute: "59" }
  const date = new Date(iso)
  return { day: date, hour: pad(date.getHours()), minute: pad(date.getMinutes()) }
}

const arrow = "grid size-11 cursor-pointer place-content-center rounded-xl border-3 border-ink bg-cream font-display text-xl font-bold outline-none hover:bg-lime focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink"

function Calendar({ selected, onSelect }: { selected: Date | null; onSelect: (day: Date) => void }) {
  const [focus, setFocus] = React.useState(() => selected ?? new Date())
  const grid = React.useRef<HTMLDivElement>(null)
  const moved = React.useRef(false)
  const today = new Date()

  // Keyboard moves carry focus along. The month buttons keep it.
  React.useEffect(() => {
    if (moved.current) grid.current?.querySelector<HTMLButtonElement>("[tabindex='0']")?.focus()
    moved.current = false
  }, [focus])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const weekday = (focus.getDay() + 6) % 7
    const next = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -weekday),
      End: () => addDays(focus, 6 - weekday),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
    }[event.key]
    if (!next) return
    event.preventDefault()
    moved.current = true
    setFocus(next())
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={arrow} aria-label="Previous month" onClick={() => setFocus(addMonths(focus, -1))}>‹</button>
        <span aria-live="polite" className="font-display text-xl font-bold">{format(focus, { month: "long", year: "numeric" })}</span>
        <button type="button" className={arrow} aria-label="Next month" onClick={() => setFocus(addMonths(focus, 1))}>›</button>
      </div>
      <div ref={grid} role="group" aria-label="Choose a day" onKeyDown={onKeyDown} className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((name) => <span key={name} aria-hidden="true" className="text-sm font-extrabold text-ink/70">{name}</span>)}
        {calendarDays(focus).map((day) => {
          const chosen = Boolean(selected) && sameDay(day, selected as Date)
          return (
            <button
              key={day.toDateString()}
              type="button"
              tabIndex={sameDay(day, focus) ? 0 : -1}
              aria-pressed={chosen}
              aria-current={sameDay(day, today) ? "date" : undefined}
              aria-label={format(day, { dateStyle: "full" })}
              onClick={() => {
                setFocus(day)
                onSelect(day)
              }}
              className={cn(
                "h-10 min-w-0 cursor-pointer rounded-xl border-3 border-transparent font-extrabold tabular-nums outline-none hover:border-ink hover:bg-lime focus-visible:outline-4 focus-visible:outline-ink",
                day.getMonth() !== focus.getMonth() && "text-ink/40",
                sameDay(day, today) && "border-dashed border-ink",
                chosen && "border-solid border-ink bg-green text-ink shadow-[0_3px_0_var(--color-ink)]"
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Picks a day and time in the reader's own time zone, and sends the exact moment with the form. */
function DateTimePicker({ id, name, defaultValue }: { id: string; name: string; defaultValue: string | null }) {
  // The server does not know the reader's time zone, so the value is shown after the page loads.
  const ready = React.useSyncExternalStore(subscribe, () => true, () => false)
  const [edited, setEdited] = React.useState<Draft | null>(null)
  const draft = edited ?? toDraft(ready ? defaultValue : null)
  const moment = draft.day ? combine(draft.day, draft.hour, draft.minute) : null
  // An untouched value is sent back exactly as it came.
  const value = edited === null ? (defaultValue ?? "") : (moment?.toISOString() ?? "")
  const change = (patch: Partial<Draft>) => setEdited({ ...draft, ...patch })

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button id={id} type="button" className={cn(control, "flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left")}>
            <span className={moment ? undefined : "font-medium text-ink/60"}>
              {moment ? format(moment, { dateStyle: "full", timeStyle: "short" }) : "No date chosen"}
            </span>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
              <rect x="3" y="5" width="22" height="20" rx="5" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="3" />
              <path d="M3 12h22M9 2v6M19 2v6" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
          {/* Centred on the screen, so it is never cut off by where the field happens to sit. */}
          <Dialog.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[role=group] [tabindex='0']")?.focus()
            }}
            className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-3xl border-4 border-ink bg-white p-4 text-ink shadow-[0_8px_0_var(--color-ink)] outline-none"
          >
            <Dialog.Title className="sr-only">Choose date and time</Dialog.Title>
            <Calendar selected={draft.day} onSelect={(day) => change({ day })} />
            <div className="grid grid-cols-2 gap-3 border-t-3 border-ink pt-3">
              {([["hour", "Hour", 23], ["minute", "Minute", 59]] as const).map(([key, label, max]) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label htmlFor={`${id}-${key}`}>{label}</Label>
                  <NumberInput id={`${id}-${key}`} className="gap-1 [&>button]:w-10 [&>input]:min-h-12" min={0} max={max} value={draft[key]} onValueChange={(next) => change({ [key]: next })} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-3 pb-1">
              <Button type="button" variant="link" size="sm" onClick={() => change({ day: null })}>Clear date</Button>
              <Dialog.Close asChild><Button type="button" size="sm">Done</Button></Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export { DateTimePicker }
