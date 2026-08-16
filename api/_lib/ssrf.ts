import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";
import { isBlockedAddress } from "./ip.js";
import { ProxyError } from "./errors.js";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const HOP_TIMEOUT_MS = 8000;
const MAX_URL_LEN = 2048;

/** Scheme/port/credential gate. Runs before any network I/O, and again on every redirect hop. */
export function parseTarget(raw: string): URL {
  let s = raw.trim();
  if (s.length > MAX_URL_LEN) throw new ProxyError("invalid_url");
  // iCloud and Outlook hand users webcal:// links constantly — it's https in disguise.
  if (/^webcal:\/\//i.test(s)) s = "https://" + s.slice("webcal://".length);

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ProxyError("invalid_url");
  }
  if (u.protocol !== "https:") throw new ProxyError("invalid_url"); // no http/file/gopher/data/ftp
  if (u.username || u.password) throw new ProxyError("invalid_url"); // https://calendar.google.com@evil.tld/
  if (u.port && u.port !== "443") throw new ProxyError("invalid_url"); // no internal services on odd ports
  return u;
}

/**
 * Resolve and reject if ANY returned address is blocked — a mixed A-record set
 * is itself an attack signature, so we never cherry-pick the public one.
 */
async function resolvePinned(hostname: string): Promise<{ ip: string; family: 4 | 6 }> {
  // A bare IP literal (incl. the bracketed IPv6 form) never goes to DNS, so
  // check it directly rather than relying on the lookup happening to fail.
  const host = hostname.replace(/^\[/, "").replace(/\]$/, "");
  const literal = isIP(host);
  if (literal) {
    if (isBlockedAddress(host)) throw new ProxyError("blocked_host");
    return { ip: host, family: literal as 4 | 6 };
  }

  let addrs;
  try {
    addrs = await dnsLookup(host, { all: true, verbatim: true });
  } catch {
    throw new ProxyError("upstream_unreachable");
  }
  if (!addrs.length) throw new ProxyError("upstream_unreachable");
  for (const a of addrs) {
    if (isBlockedAddress(a.address)) throw new ProxyError("blocked_host");
  }
  return { ip: addrs[0].address, family: addrs[0].family as 4 | 6 };
}

function request(url: URL, ip: string, family: 4 | 6): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        // Pin the socket to the address we validated. TLS still verifies against
        // the real hostname via `servername`, so this doesn't weaken cert checks.
        lookup: ((_h: string, opts: unknown, cb: unknown) => {
          const options = (typeof opts === "function" ? {} : opts) as { all?: boolean };
          const done = (typeof opts === "function" ? opts : cb) as (
            e: null,
            a: unknown,
            f?: number
          ) => void;
          if (options && options.all) done(null, [{ address: ip, family }]);
          else done(null, ip, family);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
        servername: url.hostname,
        timeout: HOP_TIMEOUT_MS,
        headers: {
          accept: "text/calendar, text/plain;q=0.8, */*;q=0.1",
          // No decompression bomb to reason about.
          "accept-encoding": "identity",
          "user-agent": "Flipit/1.0 (+https://flipit-tool.vercel.app)",
        },
      },
      resolve
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new ProxyError("timeout"));
    });
    req.on("error", () => reject(new ProxyError("upstream_unreachable")));
    req.end();
  });
}

/** Read the body, aborting the socket the moment the cap trips. */
function readCapped(res: IncomingMessage, cap: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    res.on("data", (c: Buffer) => {
      total += c.length;
      if (total > cap) {
        res.destroy();
        reject(new ProxyError("too_large"));
        return;
      }
      chunks.push(c);
    });
    res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    res.on("error", () => reject(new ProxyError("upstream_unreachable")));
  });
}

/** Fetch an ICS document with full SSRF protection. Returns the raw body. */
export async function fetchIcs(rawUrl: string, deadline: number): Promise<string> {
  let url = parseTarget(rawUrl);
  const seen = new Set<string>();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (Date.now() > deadline) throw new ProxyError("timeout");
    if (seen.has(url.href)) throw new ProxyError("upstream_unreachable"); // redirect loop
    seen.add(url.href);

    const { ip, family } = await resolvePinned(url.hostname);
    const res = await request(url, ip, family);
    const status = res.statusCode ?? 0;

    if ([301, 302, 303, 307, 308].includes(status)) {
      res.resume(); // drain
      const loc = res.headers.location;
      if (!loc) throw new ProxyError("upstream_unreachable");
      // Re-run the FULL gate on the new target — every hop, no exceptions.
      url = parseTarget(new URL(loc, url).href);
      continue;
    }

    if (status === 401 || status === 403) {
      res.destroy();
      throw new ProxyError("upstream_auth");
    }
    if (status === 404 || status === 410) {
      res.destroy();
      throw new ProxyError("upstream_not_found");
    }
    if (status < 200 || status >= 300) {
      res.destroy();
      throw new ProxyError("upstream_status", { status });
    }

    // text/html has a specific product meaning: the user pasted a share page or
    // a login-walled URL. Everything else we judge by the body, since
    // self-hosters routinely serve text/plain or application/octet-stream.
    const ct = String(res.headers["content-type"] ?? "").toLowerCase();
    if (ct.startsWith("text/html")) {
      res.destroy();
      throw new ProxyError("not_calendar");
    }
    const len = Number(res.headers["content-length"]);
    if (Number.isFinite(len) && len > MAX_BYTES) {
      res.destroy();
      throw new ProxyError("too_large");
    }

    return await readCapped(res, MAX_BYTES); // content-length is only a fast-path reject
  }
  throw new ProxyError("upstream_unreachable"); // too many redirects
}
