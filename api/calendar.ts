import type {
  CalendarRequest,
  CalendarSuccess,
} from "../src/lib/calendar/types.js";
import { ProxyError, toResponse } from "./_lib/errors.js";
import { fetchIcs, parseTarget } from "./_lib/ssrf.js";
import { parseIcs } from "./_lib/ics.js";
import { keyOf, take } from "./_lib/ratelimit.js";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_WINDOW_SKEW_MS = 7 * 24 * 60 * 60 * 1000;
const TOTAL_BUDGET_MS = 12_000;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 50;

const RATE_SALT = process.env.CALENDAR_RATE_SALT ?? "flipit-rate";
const ID_SALT = process.env.CALENDAR_ID_SALT ?? "flipit-id";
// Empty by default — the resolved-IP gate in _lib/ip.ts is the real control.
// This is an emergency clamp: set it to comma-separated host suffixes if the
// endpoint is ever abused, with no code change.
const HOST_ALLOWLIST = (process.env.CALENDAR_HOST_ALLOWLIST ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Cached by a key DERIVED FROM THE SECRET URL, so an entry can't be retrieved
 * without already possessing that URL. Memory only; dies with the instance.
 */
const cache = new Map<string, { at: number; body: CalendarSuccess }>();

function cacheGet(k: string): CalendarSuccess | null {
  const hit = cache.get(k);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(k);
    return null;
  }
  return hit.body;
}

function cacheSet(k: string, body: CalendarSuccess): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(k, { at: Date.now(), body });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Private calendar data: never let a shared cache hold this.
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  try {
    // Same-origin only. Trivially forged by a script, but it stops the endpoint
    // being casually embedded as free infrastructure in someone else's page.
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      throw new ProxyError("invalid_request");
    }

    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      throw new ProxyError("invalid_request");
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) throw new ProxyError("invalid_request");

    let body: CalendarRequest;
    try {
      body = JSON.parse(raw) as CalendarRequest;
    } catch {
      throw new ProxyError("invalid_request");
    }

    const { url, timeZone, from, to } = body ?? {};
    if (typeof url !== "string" || !url) throw new ProxyError("invalid_url");
    if (typeof timeZone !== "string" || !validTimeZone(timeZone)) {
      throw new ProxyError("invalid_request");
    }
    const fromMs = Date.parse(String(from));
    const toMs = Date.parse(String(to));
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
      throw new ProxyError("invalid_request");
    }
    if (Math.abs(fromMs - Date.now()) > MAX_WINDOW_SKEW_MS) {
      throw new ProxyError("invalid_request");
    }
    const clampedTo = Math.min(toMs, fromMs + MAX_WINDOW_MS);
    const includeTitles = body.includeTitles !== false;

    // Validate the URL shape before it is used as a cache/rate key.
    const target = parseTarget(url);
    if (HOST_ALLOWLIST.length) {
      const host = target.hostname.toLowerCase();
      const ok = HOST_ALLOWLIST.some((s) => host === s || host.endsWith("." + s));
      if (!ok) throw new ProxyError("blocked_host");
    }

    // Rate limit on the client and on the target, both salted-hashed so no raw
    // IP or URL is ever held in memory as a key.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const urlKey = keyOf(RATE_SALT, target.href);
    for (const k of [keyOf(RATE_SALT, ip), urlKey]) {
      const wait = take(k, 10, 10);
      if (wait) throw new ProxyError("rate_limited", { retryAfter: wait });
    }

    const cacheKey = `${urlKey}|${timeZone}|${fromMs}|${clampedTo}|${includeTitles}`;
    const cached = cacheGet(cacheKey);
    if (cached) return json(cached);

    const text = await fetchIcs(url, deadline);
    const { events, truncated } = parseIcs({
      text,
      tz: timeZone,
      from: fromMs,
      to: clampedTo,
      includeTitles,
      idSalt: ID_SALT,
    });

    const payload: CalendarSuccess = {
      ok: true,
      timeZone,
      window: { from: new Date(fromMs).toISOString(), to: new Date(clampedTo).toISOString() },
      fetchedAt: new Date().toISOString(),
      events,
      ...(truncated ? { truncated } : {}),
    };
    cacheSet(cacheKey, payload);
    return json(payload);
  } catch (err) {
    // Log the code only — never the URL, the ICS body, or event titles.
    if (!(err instanceof ProxyError)) console.error("calendar: unexpected failure");
    return toResponse(err);
  }
}
