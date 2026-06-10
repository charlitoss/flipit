// Cross-browser fullscreen with a graceful fallback.
//
// The standard Fullscreen API is unprefixed on desktop Chrome/Firefox/Edge,
// WebKit-prefixed on Safari (and some Android browsers), and — crucially —
// *absent on non-<video> elements in iPhone Safari*. So on iPhone the toolbar
// button can't use the real API at all; `nativeFullscreenSupported()` returns
// false there and the app falls back to a CSS "pseudo-fullscreen" instead.

interface FsDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FsElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

const docEl = () => document.documentElement as FsElement;

export function nativeFullscreenSupported(): boolean {
  const el = docEl();
  return typeof (el.requestFullscreen || el.webkitRequestFullscreen) === "function";
}

export function fullscreenElement(): Element | null {
  const d = document as FsDocument;
  return d.fullscreenElement || d.webkitFullscreenElement || null;
}

function settle(r: unknown): void {
  // requestFullscreen rejects if the gesture is stale / disallowed — swallow it.
  if (r && typeof (r as Promise<void>).catch === "function") {
    (r as Promise<void>).catch(() => {});
  }
}

export function enterFullscreen(): void {
  const el = docEl();
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    settle(req.call(el));
  } catch {
    /* ignore */
  }
}

export function exitFullscreen(): void {
  const d = document as FsDocument;
  const ex = d.exitFullscreen || d.webkitExitFullscreen;
  if (!ex) return;
  try {
    settle(ex.call(d));
  } catch {
    /* ignore */
  }
}
