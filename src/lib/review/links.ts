export type RepoLink = { kind: "repo"; owner: string; repo: string } | { kind: "gist"; id: string };

export function parseRepoLink(input: string): RepoLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "github.com") {
    if (parts.length !== 2) return null;
    const [owner, name] = parts;
    const repo = name.replace(/\.git$/, "");
    if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || /^\.+$/.test(repo)) return null;
    return { kind: "repo", owner, repo };
  }
  if (url.hostname === "gist.github.com") {
    const id = parts.at(-1);
    if (!id || parts.length > 2 || !/^[A-Fa-f0-9]+$/.test(id)) return null;
    return { kind: "gist", id };
  }
  return null;
}
