import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalError,
  CalEvent,
  CalSettings,
  calendarSupported,
  clearCal,
  fetchCalendar,
  loadCal,
  saveCal,
} from "../lib/calendar";

const REFRESH_MS = 10 * 60_000; // the upstream feed is itself cached — polling harder buys nothing

export type CalStatus = "off" | "loading" | "ok" | "error";

export interface CalendarState {
  settings: CalSettings;
  status: CalStatus;
  events: CalEvent[];
  fetchedAt: number;
  error: CalError | null;
  truncated: boolean;
  supported: boolean;
}

export interface CalendarApi extends CalendarState {
  connect: (url: string) => void;
  disconnect: () => void;
  refresh: () => void;
  setIncludeTitles: (v: boolean) => void;
}

export function useCalendar(isEmbed: boolean): CalendarApi {
  const [settings, setSettings] = useState<CalSettings>(() =>
    isEmbed ? { url: "", on: false, includeTitles: true } : loadCal()
  );
  const [status, setStatus] = useState<CalStatus>("off");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [error, setError] = useState<CalError | null>(null);
  const [truncated, setTruncated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const load = useCallback(async () => {
    const s = settingsRef.current;
    if (isEmbed || !s.on || !s.url) return; // embeds never touch the network
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("loading");
    try {
      const r = await fetchCalendar(s, ac.signal);
      if (ac.signal.aborted) return;
      setEvents(r.events);
      setFetchedAt(r.fetchedAt);
      setTruncated(r.truncated);
      setError(null);
      setStatus("ok");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e as CalError);
      setStatus("error");
    }
  }, [isEmbed]);

  // Initial load + periodic refresh, paused while the tab is hidden.
  useEffect(() => {
    if (isEmbed || !settings.on || !settings.url) {
      setStatus("off");
      setEvents([]);
      return;
    }
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVis = () => {
      // Catch up after the tab was in the background for a while.
      if (document.visibilityState === "visible" && Date.now() - fetchedAt > REFRESH_MS) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed, settings.on, settings.url, settings.includeTitles, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const persist = useCallback((next: CalSettings) => {
    setSettings(next);
    saveCal(next);
  }, []);

  const connect = useCallback(
    (url: string) => persist({ ...settingsRef.current, url: url.trim(), on: true }),
    [persist]
  );

  const disconnect = useCallback(() => {
    abortRef.current?.abort();
    clearCal();
    setSettings({ url: "", on: false, includeTitles: true });
    setEvents([]);
    setError(null);
    setFetchedAt(0);
    setStatus("off");
  }, []);

  const setIncludeTitles = useCallback(
    (v: boolean) => persist({ ...settingsRef.current, includeTitles: v }),
    [persist]
  );

  return {
    settings,
    status,
    events,
    fetchedAt,
    error,
    truncated,
    supported: calendarSupported(),
    connect,
    disconnect,
    refresh: load,
    setIncludeTitles,
  };
}
