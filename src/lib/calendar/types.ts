// The wire contract between the browser and /api/calendar.
//
// IMPORTANT: this file must stay types-only with zero imports. It is compiled
// twice — once by the root tsconfig (DOM libs, bundler resolution) and once by
// api/tsconfig.json (Node libs, NodeNext) — and both sides import it with
// `import type`, so nothing here may emit runtime code.

/** POST body sent to /api/calendar. */
export interface CalendarRequest {
  /** The provider's secret ICS URL. https (or webcal, which we normalise). */
  url: string;
  /** IANA zone from Intl.DateTimeFormat().resolvedOptions().timeZone. */
  timeZone: string;
  /** Window start, ISO instant. The client computes its own local-day bounds. */
  from: string;
  /** Window end, ISO instant. Server clamps the span to 48h. */
  to: string;
  /** false → titles are replaced with "Busy" (screen-sharing privacy mode). */
  includeTitles?: boolean;
}

export interface CalendarEvent {
  /** Salted hash of UID + recurrence id — stable across polls, leaks nothing. */
  id: string;
  /** ISO instant with offset. */
  start: string;
  end: string;
  allDay: boolean;
  /** Truncated to 120 chars; "" when includeTitles is false. */
  title: string;
  /** The derived "don't interrupt me" signal — see busyOf() in api/_lib/ics.ts. */
  busy: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  transparency: "opaque" | "transparent";
  recurring: boolean;
}

export interface CalendarSuccess {
  ok: true;
  /** Echoed back as actually applied. */
  timeZone: string;
  /** Echoed back after clamping. */
  window: { from: string; to: string };
  /** Server clock, so the UI can show "updated N minutes ago". */
  fetchedAt: string;
  /** Sorted by start. */
  events: CalendarEvent[];
  /** An expansion cap was hit — the agenda may be incomplete. */
  truncated?: boolean;
}

export type CalendarErrorCode =
  | "invalid_request"
  | "invalid_url"
  | "blocked_host"
  | "upstream_auth"
  | "upstream_not_found"
  | "upstream_status"
  | "upstream_unreachable"
  | "timeout"
  | "not_calendar"
  | "parse_failed"
  | "too_large"
  | "rate_limited"
  | "server_error";

export interface CalendarFailure {
  ok: false;
  error: {
    code: CalendarErrorCode;
    /** One short sentence, safe to render verbatim. Never contains the URL. */
    message: string;
    /** Second line: what to actually do about it. */
    hint?: string;
    /** Upstream numeric status, for upstream_status only. */
    status?: number;
    /** Seconds, for rate_limited. */
    retryAfter?: number;
  };
}

export type CalendarResponse = CalendarSuccess | CalendarFailure;
