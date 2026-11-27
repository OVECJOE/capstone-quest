/** Only same-site paths may be used as a redirect target. */
export function safePath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // Browsers read "//host" and "/\host" as another site, and drop tabs and newlines first.
  if (/^\/[/\\]/.test(value) || /[\\\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
