import { strFromU8, unzipSync } from "fflate";
import { selectFiles } from "./select.ts";
import { InputError, type Source } from "./types.ts";

export const ZIP_LIMITS = { bytes: 20 * 1024 * 1024, entries: 5000 };

const unreadable = () => new InputError("That zip file could not be opened. Create it again and re-upload.");

/**
 * Reads the telling files from an uploaded zip. Nothing is written to disk, and only chosen
 * files are expanded, each into a buffer of its declared (small) size, so a zip bomb stays small.
 */
export function readZip(bytes: Uint8Array): Source {
  if (bytes.length > ZIP_LIMITS.bytes) throw new InputError("That zip file is over 20 MB. Leave out installed packages and media.");
  const entries: { name: string; size: number }[] = [];
  try {
    unzipSync(bytes, {
      filter: (file) => {
        if (entries.length > ZIP_LIMITS.entries) throw unreadable();
        if (!file.name.endsWith("/")) entries.push({ name: file.name, size: file.originalSize });
        return false;
      },
    });
  } catch {
    throw entries.length > ZIP_LIMITS.entries
      ? new InputError("That zip holds too many files. Leave out installed packages.")
      : unreadable();
  }

  // Zipping a folder usually wraps everything in it. Drop that wrapper so README and src are found.
  const real = entries.filter((e) => !e.name.startsWith("__MACOSX/"));
  const top = real[0]?.name.split("/")[0];
  const prefix = top && real.every((e) => e.name.startsWith(`${top}/`)) ? `${top}/` : "";
  const byPath = new Map(real.map((e) => [e.name.slice(prefix.length), e]));

  const chosen = selectFiles([...byPath].map(([path, e]) => ({ path, size: e.size })));
  const wanted = new Map(chosen.map((c) => [byPath.get(c.path)!.name, c]));
  let expanded: Record<string, Uint8Array>;
  try {
    expanded = unzipSync(bytes, { filter: (file) => wanted.has(file.name) && file.originalSize === wanted.get(file.name)!.size });
  } catch {
    throw unreadable();
  }
  const files = [...wanted]
    .filter(([name]) => expanded[name] && expanded[name].length <= wanted.get(name)!.size)
    .map(([name, c]) => ({ path: c.path, content: strFromU8(expanded[name]) }));
  if (!files.length) throw new InputError("No readable code files were found in that zip.");
  return {
    description: "Zip file uploaded by the student.",
    allPaths: [...byPath.keys()],
    files,
    skipped: byPath.size - files.length,
  };
}
