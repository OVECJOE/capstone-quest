"use client"

import * as React from "react"
import { Button } from "./button"
import { Input } from "./input"

/** Text to hand to someone else, with a button that copies it. */
function CopyField({ value, id }: { value: string; id: string }) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [message, setMessage] = React.useState("")

  React.useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(""), 4000)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <Input ref={ref} id={id} readOnly value={value} onFocus={(event) => event.target.select()} className="flex-[1_1_220px]" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setMessage("Copied")
            } catch {
              ref.current?.focus()
              setMessage("Copying is blocked here. The link is selected, so copy it by hand.")
            }
          }}
        >
          Copy link
        </Button>
      </div>
      <span role="status" className="text-[15px] font-extrabold text-deep empty:hidden">{message}</span>
    </div>
  )
}

export { CopyField }
