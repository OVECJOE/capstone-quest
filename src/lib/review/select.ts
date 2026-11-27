export const LIMITS = { files: 60, fileBytes: 60_000, totalBytes: 220_000 };

const SKIP_DIR =
  /(^|\/)(node_modules|vendor|dist|build|out|target|coverage|artifacts|cache|broadcast|\.next|\.git|\.yarn|__pycache__|venv|\.venv|__MACOSX)\//;
// Foundry keeps installed dependencies in lib/ at a project root.
const FOUNDRY_LIB = /(^|\/)lib\/(forge-std|openzeppelin[^/]*|solmate|solady|chainlink[^/]*)\//;
const SKIP_FILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|go\.sum|composer\.lock)$|\.(min\.js|min\.css|map|snap)$/;
const SECRET_FILE = /(^|\/)(\.env(\.(?!example|sample|template)[^/]*)?|[^/]*\.(pem|key|keystore))$|(^|\/)id_(rsa|ed25519)$/;
const TEXT =
  /\.(sol|vy|cairo|move|rs|go|ts|tsx|js|jsx|mjs|cjs|py|rb|php|java|kt|swift|dart|c|h|cpp|cs|sql|prisma|graphql|html|css|scss|vue|svelte|md|mdx|toml|yaml|yml|json|sh)$|(^|\/)(Dockerfile|Makefile|\.env\.(example|sample|template)|\.gitignore)$/i;

function rank(path: string) {
  if (/^readme(\.\w+)?$/i.test(path)) return 0;
  if (/(^|\/)(package\.json|foundry\.toml|hardhat\.config\.\w+|Cargo\.toml|go\.mod|pyproject\.toml|requirements\.txt)$/.test(path)) return 1;
  if (/\.(sol|vy|cairo|move|rs|go)$/.test(path) && !/(^|\/)(test|tests|script)\//.test(path)) return 2;
  if (/(^|\/)(src|app|contracts|server|api|pages|components)\//.test(path)) return 3;
  if (/(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.|\.t\.sol$/.test(path)) return 4;
  if (/\.(json|yaml|yml|md|mdx)$/.test(path)) return 6;
  return 5;
}

/** Picks which files the reviewer reads, most telling first. Secret files are never read. */
export function selectFiles(entries: { path: string; size: number }[]) {
  const candidates = entries
    .filter(
      (e) =>
        TEXT.test(e.path) && !SKIP_DIR.test(e.path) && !FOUNDRY_LIB.test(e.path) &&
        !SKIP_FILE.test(e.path) && !SECRET_FILE.test(e.path) && e.size > 0 && e.size <= LIMITS.fileBytes,
    )
    .sort((a, b) => rank(a.path) - rank(b.path) || a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));

  const chosen: { path: string; size: number }[] = [];
  let total = 0;
  for (const entry of candidates) {
    if (chosen.length >= LIMITS.files) break;
    if (total + entry.size > LIMITS.totalBytes) continue;
    chosen.push(entry);
    total += entry.size;
  }
  return chosen;
}

export function secretFiles(paths: string[]) {
  return paths.filter((p) => SECRET_FILE.test(p) && !SKIP_DIR.test(p));
}
