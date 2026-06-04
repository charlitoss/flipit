// Inline SVG icons (stroke = currentColor), ported from the original toolbar.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Muted (default): speaker with a cross.
export function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

// On: just the speaker (no cross).
export function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
    </svg>
  );
}

export function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="13.5" cy="6.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8z" />
    </svg>
  );
}

export function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <polyline points="8 7 12 3 16 7" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-5.36L1 10" />
    </svg>
  );
}
