import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Config } from "../lib/config";
import { withinReminderWindow, nextBreakMs, breakLeftMs, fmtMs } from "../lib/reminders";

// The live "next break" label that sits inside the bell button when reminders
// are on. Ticks once a second; reflects a pending prompt / active break, and
// shows "Off hours" outside the active window.
export default function BellCountdown({ config }: { config: Config }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!config.reminderOn) return; // hidden while off — no need to tick
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [config.reminderOn]);

  let label: string;
  let value: ReactNode;
  if (config.breakEnd !== null) {
    label = "On break";
    value = fmtMs(breakLeftMs(config));
  } else if (config.breakPrompt) {
    // Prompt pending — scroll the user's reminder message under "Break now".
    const msg = config.reminderLabel || "Stand up and move";
    label = "Break now";
    value = (
      <span className="bell-marquee" aria-label={msg}>
        <span className="bell-marquee__track" aria-hidden="true">
          <span className="bell-marquee__seg">{msg}</span>
          <span className="bell-marquee__seg">{msg}</span>
        </span>
      </span>
    );
  } else if (!withinReminderWindow(config)) {
    label = "Breaks paused";
    value = "Off hours";
  } else {
    label = "Next break";
    value = fmtMs(nextBreakMs(config));
  }

  return (
    <span className="bell-cd">
      <span className="bell-cd-label">{label}</span>
      <span className="bell-cd-value">{value}</span>
    </span>
  );
}
