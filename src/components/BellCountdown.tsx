import { useEffect, useState } from "react";
import type { Config } from "../lib/config";
import { withinReminderWindow, nextBreakMs } from "../lib/reminders";

// The live "next break" label that sits inside the bell button when reminders
// are on. Ticks once a second; shows "Off hours" outside the active window.
export default function BellCountdown({ config }: { config: Config }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!config.reminderOn) return; // hidden while off — no need to tick
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [config.reminderOn]);

  const within = withinReminderWindow(config);
  const s = Math.round(nextBreakMs(config) / 1000);
  const value = within ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "Off hours";

  return (
    <span className="bell-cd">
      <span className="bell-cd-label">{within ? "Next break" : "Breaks paused"}</span>
      <span className="bell-cd-value">{value}</span>
    </span>
  );
}
