"use client"

import * as React from "react"
import { problem } from "@/lib/validity"

type Control = HTMLInputElement | HTMLTextAreaElement

/** A labelled control. Problems found when the form is sent are shown here, in the page's own style. */
function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  const [error, setError] = React.useState("")
  const invalid = React.useRef<Control>(null)
  const id = React.useId()
  const clear = () => {
    invalid.current?.removeAttribute("aria-invalid")
    invalid.current?.removeAttribute("aria-describedby")
    invalid.current = null
    setError("")
  }

  return (
    <div
      data-slot="field"
      className="flex flex-col gap-1.5"
      onInvalid={(event) => {
        // Stops the browser's own pop-up.
        event.preventDefault()
        const target = event.target as Control
        invalid.current = target
        target.setAttribute("aria-invalid", "true")
        target.setAttribute("aria-describedby", id)
        setError(problem(target))
      }}
      onInput={clear}
      // Stepper buttons change a value without typing.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) clear()
      }}
    >
      {label}
      {children}
      {error ? <p id={id} role="alert" className="w-fit rounded-xl border-3 border-ink bg-blush px-3 py-1 text-[15px] font-extrabold">{error}</p> : null}
      {hint ? <span className="text-[15px]">{hint}</span> : null}
    </div>
  )
}

export { Field }
