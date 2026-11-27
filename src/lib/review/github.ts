import "server-only";
import { parseRepoLink } from "./links";
import { selectFiles, selectGistFiles } from "./select";
import { InputError, type Source, type SourceFile } from "./types";

async function api<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "capstone-quest",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) throw new InputError("GitHub could not find that link. Check it is correct and public.");
  if (res.status === 409) throw new InputError("That repository is empty. Push your code, then submit again.");
  if (!res.ok) throw new Error(`GitHub replied ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** Records which version was read, so every later run reads the same one. */
export type Pin = (ref: string) => Promise<void>;

async function readRepo(owner: string, repo: string, pinned: string | null, pin: Pin): Promise<Source> {
  const base = `/repos/${owner}/${repo}`;
  const meta = await api<{ private: boolean; default_branch: string; description: string | null; fork: boolean }>(base);
  // The server's token may be able to see private repositories. Students must not reach them.
  if (meta.private) throw new InputError("That repository is private. Make it public, then submit again.");
  const commit = await api<{ sha: string; commit: { tree: { sha: string } } }>(
    `${base}/commits/${encodeURIComponent(pinned ?? meta.default_branch)}`,
  );
  if (!pinned) await pin(commit.sha);
  const tree = await api<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `${base}/git/trees/${commit.commit.tree.sha}?recursive=1`,
  );
  const blobs = tree.tree.filter((e) => e.type === "blob").map((e) => ({ path: e.path, size: e.size ?? 0 }));
  const chosen = selectFiles(blobs);

  const files: SourceFile[] = [];
  for (let i = 0; i < chosen.length; i += 8) {
    const batch = await Promise.all(
      chosen.slice(i, i + 8).map(async ({ path }) => {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commit.sha}/${path
          .split("/").map(encodeURIComponent).join("/")}`;
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`Could not download ${path}: ${res.status}`);
        return { path, content: await res.text() };
      }),
    );
    files.push(...batch);
  }
  return {
    description: [
      `Repository ${owner}/${repo} at commit ${commit.sha.slice(0, 7)}.`,
      meta.fork ? "This repository is a fork of another repository." : "",
      tree.truncated ? "The file list was too large for GitHub to return in full." : "",
      meta.description ?? "",
    ].filter(Boolean).join(" "),
    allPaths: blobs.map((b) => b.path),
    files,
    skipped: blobs.length - files.length,
  };
}

async function readGist(id: string, pinned: string | null, pin: Pin): Promise<Source> {
  const gist = await api<{
    description: string | null;
    history?: { version: string }[];
    files: Record<string, { filename: string; size: number; content?: string; truncated?: boolean }>;
  }>(`/gists/${id}${pinned ? `/${pinned}` : ""}`);
  if (!pinned) {
    const version = gist.history?.[0]?.version;
    if (!version) throw new Error("GitHub did not say which gist version this is");
    await pin(version);
  }
  const all = Object.values(gist.files);
  const wanted = new Set(selectGistFiles(all.map((f) => ({ path: f.filename, size: f.size }))).map((f) => f.path));
  const files = all
    .filter((f) => wanted.has(f.filename) && typeof f.content === "string" && !f.truncated)
    .map((f) => ({ path: f.filename, content: f.content as string }));
  return {
    description: `GitHub gist. ${gist.description ?? ""}`.trim(),
    allPaths: all.map((f) => f.filename),
    files,
    skipped: all.length - files.length,
  };
}

export async function readSource(link: string, pinned: string | null, pin: Pin): Promise<Source> {
  const parsed = parseRepoLink(link);
  if (!parsed) throw new InputError("That is not a GitHub repository or gist link.");
  const source = parsed.kind === "repo"
    ? await readRepo(parsed.owner, parsed.repo, pinned, pin)
    : await readGist(parsed.id, pinned, pin);
  if (!source.files.length) throw new InputError("No readable code files were found at that link.");
  return source;
}
