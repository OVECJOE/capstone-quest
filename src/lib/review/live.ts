import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { isPublicAddress } from "./address.ts";
import type { LiveCheck } from "./types.ts";

const BODY_LIMIT = 200_000;

// Checking at connect time stops a hostname from resolving to a private address after validation.
const publicOnly: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new Error("That address is not a public website"), "", 4);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

export function checkTarget(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Only web addresses can be checked";
  if (url.port || url.username || url.password) return "Links with custom ports or passwords are not checked";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) return "That address is not a public website";
  return null;
}

function get(url: URL, signal: AbortSignal) {
  return new Promise<{ status: number; location?: string; body: string }>((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(
      url,
      { lookup: publicOnly, signal, agent: false, headers: { "user-agent": "capstone-quest-checker", accept: "text/html,*/*" } },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        const chunks: Buffer[] = [];
        let size = 0;
        const done = () => resolve({ status, location, body: Buffer.concat(chunks).toString("utf8") });
        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk.subarray(0, BODY_LIMIT - size));
          size += chunk.length;
          if (size >= BODY_LIMIT) {
            done();
            req.destroy();
          }
        });
        res.on("end", done);
        res.on("error", reject);
      },
    );
    req.on("error", reject);
  });
}

export function pageText(html: string) {
  // The page is the student's, so every pattern here has to stay fast on hostile input.
  const title = /<title\b[^<>]*>([^<]*)<\/title>/i.exec(html)?.[1].trim().slice(0, 200) ?? "";
  const excerpt = html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, " ")
    .replace(/<[^<>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
  return { title, excerpt };
}

/** Loads the live link once, as a plain request. It does not run the page's JavaScript or click anything. */
export async function checkLive(link: string): Promise<LiveCheck> {
  const started = Date.now();
  const signal = AbortSignal.timeout(15_000);
  const result = (patch: Partial<LiveCheck>): LiveCheck => ({
    ok: false, status: null, finalUrl: link, milliseconds: Date.now() - started,
    title: "", excerpt: "", error: null, ...patch,
  });
  let current = link;
  try {
    for (let hop = 0; hop < 6; hop++) {
      const url = new URL(current);
      const problem = checkTarget(url);
      if (problem) return result({ finalUrl: current, error: problem });
      const res = await get(url, signal);
      if (res.status >= 300 && res.status < 400 && res.location) {
        current = new URL(res.location, url).toString();
        continue;
      }
      return result({ ok: res.status >= 200 && res.status < 300, status: res.status, finalUrl: current, ...pageText(res.body) });
    }
    return result({ finalUrl: current, error: "The link redirects too many times" });
  } catch (error) {
    const message = signal.aborted ? "The site did not answer within 15 seconds" : error instanceof Error ? error.message : "The site could not be reached";
    return result({ finalUrl: current, error: message });
  }
}
