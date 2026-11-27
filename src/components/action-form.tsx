"use client";

import { startTransition, useActionState } from "react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

type Props = Omit<React.ComponentProps<"form">, "action"> & {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  /** For decisions that cannot be undone: pressing Enter in a field must not send the form. */
  requireClick?: boolean;
};

/** A form that reports errors and keeps what the person typed when something goes wrong. */
export function ActionForm({ action, children, className, requireClick, ...props }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const error = pending ? undefined : state.error;
  return (
    <form
      {...props}
      // Fields report their own problems, so the browser's pop-ups stay off.
      noValidate
      className={cn("flex flex-col gap-4", className)}
      onKeyDown={(event) => {
        if (requireClick && event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const skipChecks = submitter instanceof HTMLButtonElement && submitter.formNoValidate;
        if (!skipChecks && !form.checkValidity()) {
          form.querySelector<HTMLElement>("input:invalid, textarea:invalid")?.focus();
          return;
        }
        const data = new FormData(form, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      <p role="status" className={cn("font-extrabold empty:hidden", error ? "rounded-2xl border-3 border-ink bg-blush px-4 py-3" : "text-deep")}>
        {pending ? "Working on it…" : (state.error ?? state.done)}
      </p>
    </form>
  );
}
