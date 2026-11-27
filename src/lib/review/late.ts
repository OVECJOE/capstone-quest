/** A version is frozen when it is first read. Say so if that happened well after the student sent it. */
export function lateReadWarning(submittedAt: string, pinnedAt: string | null) {
  if (!pinnedAt) return null;
  const minutes = Math.round((Date.parse(pinnedAt) - Date.parse(submittedAt)) / 60_000);
  return minutes > 10
    ? `The code was first read ${minutes} minutes after it was submitted, so it may include later changes. Check the commit dates.`
    : null;
}
