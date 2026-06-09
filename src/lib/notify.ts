// Browser notifications for break reminders. Everything here
// degrades gracefully: if notifications are unsupported or not granted, the
// callers still show an on-screen toast and play a sound.

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}

// Must be called from a user gesture (e.g. a button click).
export async function requestNotify(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// Fire-and-forget. No-ops unless permission is granted; never throws.
export function showNotification(title: string, body: string): void {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "flipit", silent: false });
  } catch {
    /* some platforms require a service worker; just skip */
  }
}
