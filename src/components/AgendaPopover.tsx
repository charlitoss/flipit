import { useState } from "react";
import { eventAt, fmtTime } from "../lib/calendar";
import { BackIcon, GearIcon } from "./Icons";
import type { CalendarApi } from "../hooks/useCalendar";

function fmtAgo(ms: number): string {
  const m = Math.floor((Date.now() - ms) / 60_000);
  if (m < 1) return "just now";
  if (m === 1) return "1 minute ago";
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  return h === 1 ? "1 hour ago" : `${h} hours ago`;
}

/** Host + filename only — the secret token in the path is never shown. */
function maskUrl(u: string): string {
  try {
    const url = new URL(u.replace(/^webcal:/i, "https:"));
    const parts = url.pathname.split("/").filter(Boolean);
    return `${url.hostname}/…/${parts[parts.length - 1] || ""}`;
  } catch {
    return "your calendar link";
  }
}

export default function AgendaPopover({ cal }: { cal: CalendarApi }) {
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"agenda" | "settings">("agenda");
  const connected = cal.settings.on && !!cal.settings.url;

  // ----- Not available off the hosted deployment (file:// or GitHub Pages) -----
  if (!cal.supported) {
    return (
      <div id="agendaPop" className="popover">
        <h3>Today</h3>
        <div className="rem-note">
          Calendar needs the hosted version of Flipit — this build has no server to
          fetch your calendar through.
        </div>
      </div>
    );
  }

  // ----- Connect -----
  if (!connected) {
    return (
      <div id="agendaPop" className="popover">
        <h3>Connect a calendar</h3>
        <div className="rem-field cal-connect">
          <span className="ctl-label">iCal URL</span>
          <input
            className="rem-input"
            type="url"
            inputMode="url"
            placeholder="https://…/basic.ics"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) cal.connect(draft);
            }}
          />
        </div>
        <button
          className="btn-primary compact cal-connect-btn"
          disabled={!draft.trim()}
          onClick={() => cal.connect(draft)}
        >
          Connect
        </button>
        <div className="rem-note">
          <p className="cal-help">
            Google Calendar → Settings → your calendar → <em>Secret address in iCal
            format</em>. Outlook, iCloud and Fastmail all publish a similar link.
          </p>
          <p className="cal-help">
            The link is saved only in this browser and never goes into a share link.
            Flipit’s server uses it to fetch your calendar and doesn’t store or log
            it. Anyone with the link can read your calendar — reset it at your
            provider if it leaks.
          </p>
        </div>
      </div>
    );
  }

  // ----- Settings -----
  if (view === "settings") {
    return (
      <div id="agendaPop" className="popover">
        <div className="cal-head">
          <button
            className="cal-icon-btn"
            title="Back to today"
            aria-label="Back to today"
            onClick={() => setView("agenda")}
          >
            <BackIcon />
          </button>
          <h3>Calendar settings</h3>
        </div>

        <div className="cal-source">
          <span className="ctl-label">Connected to</span>
          <span className="cal-source-url" title="The secret part of the link is hidden">
            {maskUrl(cal.settings.url)}
          </span>
        </div>

        <div className="toggle-row rem-sep">
          <span>Show event names</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={cal.settings.includeTitles}
              onChange={(e) => cal.setIncludeTitles(e.target.checked)}
            />
            <span className="track" />
          </label>
        </div>
        <p className="cal-help cal-sub-help">
          Off keeps titles on the server — the agenda just shows “Busy”. Useful when
          Flipit is on a shared screen.
        </p>

        <div className="cal-actions rem-sep">
          <button className="btn-ghost compact" onClick={cal.refresh}>
            Refresh now
          </button>
          <button className="btn-ghost compact cal-danger" onClick={cal.disconnect}>
            Disconnect
          </button>
        </div>

        <p className="cal-help cal-lag">
          Calendar feeds are cached by your provider, so brand-new events can take a
          while to appear. Breaks are only deferred for events Flipit can see.
        </p>
      </div>
    );
  }

  // ----- Error -----
  if (cal.status === "error" && !cal.events.length) {
    return (
      <div id="agendaPop" className="popover">
        <div className="cal-head">
          <h3>Today</h3>
          <button
            className="cal-icon-btn"
            title="Calendar settings"
            aria-label="Calendar settings"
            onClick={() => setView("settings")}
          >
            <GearIcon />
          </button>
        </div>
        <div className="cal-empty">
          <div className="cal-empty-title">{cal.error?.message ?? "Something went wrong."}</div>
          {cal.error?.hint && <div className="cal-empty-hint">{cal.error.hint}</div>}
        </div>
        <div className="cal-actions">
          <button className="btn-ghost compact" onClick={cal.refresh}>
            Try again
          </button>
          <button className="btn-ghost compact cal-danger" onClick={cal.disconnect}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // ----- Loading (first fetch) -----
  if (cal.status === "loading" && !cal.events.length) {
    return (
      <div id="agendaPop" className="popover">
        <h3>Today</h3>
        <div className="cal-empty">
          <div className="cal-empty-title">Loading your day…</div>
        </div>
      </div>
    );
  }

  // ----- Agenda -----
  const now = Date.now();
  const current = eventAt(cal.events, now);
  const shown = cal.events.filter((e) => !e.cancelled);

  return (
    <div id="agendaPop" className="popover">
      <div className="cal-head">
        <h3>Today</h3>
        <button
          className="cal-icon-btn"
          title="Calendar settings"
          aria-label="Calendar settings"
          data-pop-trigger
          onClick={() => setView("settings")}
        >
          <GearIcon />
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="cal-empty">
          <div className="cal-empty-title">Nothing scheduled.</div>
          <div className="cal-empty-hint">Enjoy the clear day.</div>
        </div>
      ) : (
        <ul className="cal-list">
          {shown.map((e) => {
            const isNow = current?.id === e.id;
            const past = e.end <= now;
            return (
              <li
                key={e.id}
                className={
                  "cal-row" +
                  (isNow ? " now" : "") +
                  (past ? " past" : "") +
                  (e.allDay ? " allday" : "")
                }
              >
                <span className="cal-row-time">
                  {e.allDay ? "All day" : fmtTime(e.start)}
                </span>
                <span className="cal-row-title">{e.title || "Busy"}</span>
                {isNow && <span className="cal-row-badge">now</span>}
              </li>
            );
          })}
        </ul>
      )}

      {cal.truncated && (
        <div className="cal-empty-hint cal-truncated">
          This calendar is very large — some events may be missing.
        </div>
      )}

      <div className="cal-foot">
        <span className="cal-updated">
          {cal.status === "loading"
            ? "Refreshing…"
            : cal.fetchedAt
              ? `Updated ${fmtAgo(cal.fetchedAt)}`
              : ""}
        </span>
        <button className="btn-ghost compact cal-refresh" onClick={cal.refresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}
