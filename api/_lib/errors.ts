import type { CalendarErrorCode, CalendarFailure } from "../../src/lib/calendar/types.js";

/**
 * A failure with a fixed code and NO user data.
 *
 * Uncaught throws land in Vercel's function logs with their message and stack,
 * so the ICS URL (a bearer credential) must never reach an Error message. Only
 * the code and a small structured meta are carried.
 */
export class ProxyError extends Error {
  readonly code: CalendarErrorCode;
  readonly status?: number;
  readonly retryAfter?: number;

  constructor(code: CalendarErrorCode, meta: { status?: number; retryAfter?: number } = {}) {
    super(code); // message === code: safe to log
    this.name = "ProxyError";
    this.code = code;
    this.status = meta.status;
    this.retryAfter = meta.retryAfter;
  }
}

interface Copy {
  http: number;
  message: string;
  hint?: string;
}

// The UI renders `message` as the headline and `hint` as the action line.
const COPY: Record<CalendarErrorCode, Copy> = {
  invalid_request: {
    http: 400,
    message: "That request didn’t look right.",
    hint: "Reload Flipit and try connecting again.",
  },
  invalid_url: {
    http: 400,
    message: "That doesn’t look like a calendar link.",
    hint: "Paste the secret iCal address — it starts with https:// (or webcal://) and ends in .ics",
  },
  blocked_host: {
    http: 400,
    message: "That address points to a private network Flipit can’t reach.",
    hint: "Self-hosted calendars need to be reachable from the public internet over HTTPS.",
  },
  upstream_auth: {
    http: 400,
    message: "Your calendar provider refused that link.",
    hint: "Secret calendar links can’t require a login. Copy a fresh secret iCal address and try again.",
  },
  upstream_not_found: {
    http: 400,
    message: "Your calendar provider says that link no longer exists.",
    hint: "It was probably reset. Copy the current secret iCal address from your calendar settings.",
  },
  upstream_status: {
    http: 502,
    message: "Your calendar provider returned an error.",
    hint: "This is usually temporary — try again in a minute.",
  },
  upstream_unreachable: {
    http: 502,
    message: "Flipit couldn’t reach your calendar provider.",
    hint: "Check the link, then try again in a minute.",
  },
  timeout: {
    http: 504,
    message: "Your calendar took too long to respond.",
    hint: "Try again — very large calendars can be slow the first time.",
  },
  not_calendar: {
    http: 422,
    message: "That link returned a web page, not a calendar.",
    hint: "Use the secret iCal address (ending in .ics), not the calendar’s share or web page link.",
  },
  parse_failed: {
    http: 422,
    message: "Flipit couldn’t read that calendar file.",
    hint: "Double-check the secret iCal address from your calendar settings.",
  },
  too_large: {
    http: 413,
    message: "That calendar is too large to read.",
    hint: "Try connecting a single calendar rather than a combined feed.",
  },
  rate_limited: {
    http: 429,
    message: "Too many calendar refreshes.",
    hint: "Give it a minute, then try again.",
  },
  server_error: {
    http: 500,
    message: "Something went wrong on Flipit’s side.",
    hint: "Try again in a moment.",
  },
};

export function toResponse(err: unknown): Response {
  const e =
    err instanceof ProxyError ? err : new ProxyError("server_error");
  const copy = COPY[e.code];
  const body: CalendarFailure = {
    ok: false,
    error: {
      code: e.code,
      message: copy.message,
      hint: copy.hint,
      ...(e.status !== undefined ? { status: e.status } : {}),
      ...(e.retryAfter !== undefined ? { retryAfter: e.retryAfter } : {}),
    },
  };
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (e.retryAfter !== undefined) headers["retry-after"] = String(e.retryAfter);
  return new Response(JSON.stringify(body), { status: copy.http, headers });
}
