/** A link a student supplied. Anything that is not a web address is shown as plain text. */
export function ExtLink({ href, label }: { href: string; label?: string }) {
  if (!/^https?:\/\//i.test(href)) return <span className="break-all">{href}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-extrabold break-all underline underline-offset-4">{label ?? href}</a>;
}
