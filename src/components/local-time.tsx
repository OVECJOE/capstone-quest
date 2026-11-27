"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const format = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso));

/** Shows a moment in the reader's own time zone. */
export function LocalTime({ iso }: { iso: string }) {
  const value = useSyncExternalStore(subscribe, () => format(iso), () => `${format(iso, "UTC")} UTC`);
  return <time dateTime={iso}>{value}</time>;
}
