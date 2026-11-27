export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Noon avoids landing on the wrong day where clocks change at midnight. */
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);

/** Keeps the day of the month, or uses the last one when the target month is shorter. */
export function addMonths(date: Date, months: number) {
  const last = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), last), 12);
}

/** The whole weeks, Monday first, that cover the month holding this date. */
export function calendarDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => addDays(first, i - lead));
}

/** A local day plus typed hour and minute. Anything unfinished or too large is brought into range. */
export function combine(day: Date, hour: string, minute: string) {
  const within = (text: string, max: number) => Math.min(max, Number(text) || 0);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), within(hour, 23), within(minute, 59));
}
