import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicAddress } from "../src/lib/review/address.ts";
import { earnedBadges } from "../src/lib/badges.ts";
import { journey } from "../src/lib/journey.ts";
import { safePath } from "../src/lib/paths.ts";
import { addMonths, calendarDays, combine } from "../src/lib/calendar.ts";
import { clean, inviteCode } from "../src/lib/forms.ts";
import { problem } from "../src/lib/validity.ts";
import { strToU8, zipSync } from "fflate";
import { isStale, lateReadWarning } from "../src/lib/review/late.ts";
import { readZip } from "../src/lib/review/zip.ts";
import { InputError } from "../src/lib/review/types.ts";
import { parseRepoLink } from "../src/lib/review/links.ts";
import { checkLive, pageText } from "../src/lib/review/live.ts";
import { secretFiles, selectFiles, selectGistFiles, LIMITS } from "../src/lib/review/select.ts";
import { normaliseCriteria, normaliseScores } from "../src/lib/review/shape.ts";

test("accepts repository and gist links", () => {
  assert.deepEqual(parseRepoLink("https://github.com/ada/vault.git"), { kind: "repo", owner: "ada", repo: "vault" });
  assert.deepEqual(parseRepoLink("https://gist.github.com/ada/ab12"), { kind: "gist", id: "ab12" });
});

test("rejects other links", () => {
  for (const bad of ["http://github.com/a/b", "https://github.com.evil.com/a/b", "https://github.com/a",
    "https://github.com/a/..", "https://user@github.com/a/b", "https://github.com/a/b/tree/main", "nonsense"]) {
    assert.equal(parseRepoLink(bad), null, bad);
  }
});

test("only public addresses are allowed", () => {
  for (const a of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.1.1", "172.20.0.1", "0.0.0.0", "::1", "::",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "fd00::1", "fe80::1", "64:ff9b::7f00:1", "2002:7f00:1::", "localhost"]) {
    assert.equal(isPublicAddress(a), false, a);
  }
  for (const a of ["8.8.8.8", "76.76.21.21", "2606:4700::1111"]) assert.equal(isPublicAddress(a), true, a);
});

test("live check refuses private targets, including odd spellings", async () => {
  for (const url of ["http://127.0.0.1/", "http://2130706433/", "http://[::1]/", "http://localhost/",
    "http://169.254.169.254/latest", "http://example.com:8080/", "file:///etc/passwd"]) {
    const result = await checkLive(url);
    assert.equal(result.ok, false, url);
    assert.equal(result.status, null, url);
    assert.ok(result.error, url);
  }
});

test("page text drops scripts and tags", () => {
  assert.deepEqual(pageText("<title>Vault</title><script>x()</script><h1>Save</h1>"), { title: "Vault", excerpt: "Vault Save" });
});

test("page text stays fast on hostile pages", () => {
  const started = Date.now();
  for (const html of ["<".repeat(200_000), "<svg ".repeat(40_000), "<title".repeat(33_000)]) pageText(html);
  assert.ok(Date.now() - started < 1000);
});

test("redirects stay on this site", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "/\t/evil.com", "", undefined]) assert.equal(safePath(bad), "/");
  assert.equal(safePath("/join/abc"), "/join/abc");
});

test("the journey map follows the work", () => {
  assert.equal(journey(null, []).current, "idea");
  assert.equal(journey("proposed", []).current, "idea");
  assert.equal(journey("approved", []).current, "build");
  assert.equal(journey("approved", [{ attempt: 1, status: "void" }]).current, "build");
  assert.equal(journey("approved", [{ attempt: 1, status: "ready" }]).current, "review");
  assert.equal(journey("approved", [{ attempt: 1, status: "graded" }, { attempt: 2, status: "queued" }]).current, "review");
  assert.deepEqual(journey("approved", [{ attempt: 1, status: "graded" }]).done, ["idea", "rules", "build", "review", "grade"]);
});

test("file selection skips dependencies and secrets, and respects limits", () => {
  const entries = ["README.md", "src/Vault.sol", "test/Vault.t.sol", "node_modules/a/index.js", "lib/forge-std/src/Test.sol",
    ".env", "config/.env.local", ".env.example", "package-lock.json", "logo.png", "app/lib/utils.ts"].map((path) => ({ path, size: 100 }));
  const chosen = selectFiles(entries).map((f) => f.path);
  assert.deepEqual(chosen.slice(0, 2), ["README.md", "src/Vault.sol"]);
  assert.deepEqual([...chosen].sort(), [".env.example", "README.md", "app/lib/utils.ts", "src/Vault.sol", "test/Vault.t.sol"]);
  assert.deepEqual(secretFiles(entries.map((e) => e.path)), [".env", "config/.env.local"]);
  const many = Array.from({ length: 200 }, (_, i) => ({ path: `src/f${i}.ts`, size: 10_000 }));
  assert.ok(selectFiles(many).reduce((s, f) => s + f.size, 0) <= LIMITS.totalBytes);
});

test("criteria always total 100", () => {
  for (const points of [[1, 1, 1], [50, 70], [1000, 1, 1, 1], [33.3, 33.3, 33.3]]) {
    const out = normaliseCriteria(points.map((p, i) => ({ name: `c${i}`, description: "", points: p })));
    assert.equal(out.reduce((s, c) => s + c.points, 0), 100);
    assert.ok(out.every((c) => Number.isInteger(c.points) && c.points >= 1));
  }
  assert.throws(() => normaliseCriteria([]));
});

test("scores are clamped and gaps flagged", () => {
  const criteria = [{ name: "Works", description: "", points: 60 }, { name: "Tests", description: "", points: 40 }];
  const out = normaliseScores(criteria, [{ name: "works", score: 99.6, comment: "ok" }]);
  assert.deepEqual(out.map((s) => s.score), [60, 0]);
  assert.match(out[1].comment, /yourself/);
});

test("zip: strips the wrapper folder and skips secrets and packages", () => {
  const zip = zipSync({ "vault/README.md": strToU8("hi"), "vault/src/Vault.sol": strToU8("contract V {}"),
    "vault/.env": strToU8("SECRET"), "vault/node_modules/x/index.js": strToU8("x"), "__MACOSX/vault/._README.md": strToU8("junk") });
  const source = readZip(zip);
  assert.deepEqual(source.files.map((f) => f.path), ["README.md", "src/Vault.sol"]);
  assert.ok(!JSON.stringify(source.files).includes("SECRET"));
});

test("zip: oversized and broken files are the student's to fix", () => {
  assert.throws(() => readZip(strToU8("not a zip")), InputError);
  assert.throws(() => readZip(zipSync({ "big.ts": new Uint8Array(5_000_000) })), InputError);
});

test("zip: a file that lies about its size cannot expand past it", () => {
  const zip = zipSync({ "a.ts": new Uint8Array(3_000_000).fill(97) });
  // Rewrite the declared uncompressed size in both headers to 100 bytes.
  const view = new DataView(zip.buffer, zip.byteOffset);
  for (let i = 0; i < zip.length - 4; i++) {
    if (view.getUint32(i, true) === 0x04034b50) view.setUint32(i + 22, 100, true);
    if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 100, true);
  }
  try {
    const source = readZip(zip);
    assert.ok(source.files[0].content.length <= 100);
  } catch (error) {
    assert.ok(error instanceof InputError);
  }
});

test("a late first read is flagged", () => {
  assert.equal(lateReadWarning("2026-01-01T10:00:00Z", "2026-01-01T10:02:00Z"), null);
  assert.match(lateReadWarning("2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z")!, /120 minutes/);
});

test("badges follow the record", () => {
  const grade = (total: number, readme_ok = false) => ({ total, readme_ok, live_ok: false });
  const ids = (status: string | null, list: Parameters<typeof earnedBadges>[1]) => earnedBadges(status, list).filter((b) => b.earned).map((b) => b.id);
  assert.deepEqual(ids("proposed", []), []);
  assert.deepEqual(ids("approved", [{ attempt: 1, status: "graded", grades: grade(60, true) }]), ["approval", "readme"]);
  assert.deepEqual(ids("approved", [{ attempt: 2, status: "graded", grades: grade(70) }, { attempt: 1, status: "graded", grades: grade(60) }]), ["approval", "comeback"]);
  assert.deepEqual(ids("approved", [{ attempt: 1, status: "graded", grades: grade(70) }, { attempt: 2, status: "graded", grades: grade(60) }]), ["approval"]);
});

test("typed text keeps the length the screen counted", () => {
  assert.equal(clean("  one\r\ntwo\rthree  "), "one\ntwo\nthree");
  assert.equal(clean(null), "");
});

test("invite codes are found in pasted links", () => {
  for (const pasted of ["abc123", " abc123 ", "https://app.test/join/abc123", "https://app.test/join/abc123/",
    "https://app.test/join/abc123?utm_source=mail", "https://app.test/join/abc123/#top"]) {
    assert.equal(inviteCode(pasted), "abc123", pasted);
  }
});

test("a gist with nothing but unusual files is read, without its secrets", () => {
  const files = [".env", "prod.env", ".envrc", "id_rsa", "server.PEM", "notes"].map((path) => ({ path, size: 10 }));
  assert.deepEqual(selectGistFiles(files).map((f) => f.path), ["notes"]);
  const many = Array.from({ length: 100 }, (_, i) => ({ path: `note${i}`, size: 50_000 }));
  assert.ok(selectGistFiles(many).reduce((s, f) => s + f.size, 0) <= LIMITS.totalBytes);
});

test("criteria names differ by more than case", () => {
  const out = normaliseCriteria([{ name: "Tests", description: "", points: 50 }, { name: "tests", description: "", points: 50 }]);
  assert.deepEqual(out.map((c) => [c.name, c.points]), [["Tests", 100]]);
});

test("only an old run can be taken over", () => {
  const now = Date.parse("2026-01-01T10:10:00Z");
  assert.equal(isStale("2026-01-01T10:05:00Z", now), false);
  assert.equal(isStale("2026-01-01T10:03:00Z", now), true);
  assert.equal(isStale(null, now), true);
});

test("the calendar covers whole weeks and clamps short months", () => {
  const days = calendarDays(new Date(2026, 1, 15));
  assert.equal(days.length % 7, 0);
  assert.equal(days[0].getDay(), 1);
  assert.equal(days.filter((d) => d.getMonth() === 1).length, 28);
  assert.equal(addMonths(new Date(2026, 0, 31), 1).getDate(), 28);
  assert.equal(addMonths(new Date(2026, 0, 15), -1).getFullYear(), 2025);
  const moment = combine(new Date(2026, 2, 4), "99", "");
  assert.deepEqual([moment.getDate(), moment.getHours(), moment.getMinutes()], [4, 23, 0]);
});

test("field problems are explained plainly", () => {
  const validity = { valueMissing: false, typeMismatch: false, tooShort: false, customError: false };
  assert.match(problem({ type: "file", validationMessage: "", validity: { ...validity, valueMissing: true } }), /file/);
  assert.match(problem({ type: "url", validationMessage: "", validity: { ...validity, typeMismatch: true } }), /https/);
  assert.equal(problem({ type: "text", validationMessage: "Too big", validity: { ...validity, customError: true } }), "Too big");
});
