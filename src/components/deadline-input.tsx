"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";

const subscribe = () => () => {};
const toLocal = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** The picker works in local time; the form sends an exact moment. */
export function DeadlineInput({ initial }: { initial: string | null }) {
  const shown = useSyncExternalStore(subscribe, () => (initial ? toLocal(initial) : ""), () => "");
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? shown;
  return (
    <>
      <Input id="deadline" type="datetime-local" value={value} onChange={(e) => setEdited(e.target.value)} />
      <input type="hidden" name="deadline" value={edited === null ? (initial ?? "") : edited ? new Date(edited).toISOString() : ""} />
    </>
  );
}
