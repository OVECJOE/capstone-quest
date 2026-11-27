"use client";

import { startTransition, useActionState } from "react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

type Props = Omit<React.ComponentProps<"form">, "action"> & {
  action: (state: FormState, data: FormData) => Promise<FormState>;
};

/** A form that reports errors and keeps what the person typed when something goes wrong. */
export function ActionForm({ action, children, className, ...props }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form
      {...props}
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(event.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      <p role="status" className={cn("font-extrabold empty:hidden", state.error ? "rounded-2xl border-3 border-ink bg-[#FFE1D6] px-4 py-3" : "text-deep")}>
        {pending ? "Working on it…" : (state.error ?? state.done)}
      </p>
    </form>
  );
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label}
      {children}
      {hint ? <span className="text-[15px]">{hint}</span> : null}
    </div>
  );
}
