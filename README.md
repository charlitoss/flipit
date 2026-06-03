# Flipit

A high-end split-flap (Solari) flip-board display — clock, countdown, and message modes with an authentic airport-style flutter. Zero dependencies, zero build step: it's a single self-contained `index.html`.

## Features

- **Three modes**
  - **Clock** — 12/24-hour, optional seconds, live date caption
  - **Countdown** — count down to a date & time or a quick H/M/S duration, with a custom "finished" label
  - **Message** — multi-line departure-board text (letters, numbers & `. , : ' ! ? - / & @ # % +`)
- **Airport flutter** — each cell clatters through random characters and the board resolves in a left-to-right wave, just like a real Solari board
- **10 color palettes** — Onyx, Slate, Midnight, Forest, Crimson, Synthwave, Amber (dark) + Departures, Paper, Mint (light)
- **Realistic flip animation** — 3D fold with hinge line, highlights and shadows
- **Export & share**
  - **Shareable link** — the full display state is encoded into a short URL
  - **Embed widget** — copy-paste `<iframe>` that renders a clean, chrome-free board
  - **Image** — download the board as a PNG (drawn to canvas, retina resolution)
- **Premium touches** — fullscreen, auto-hiding controls (kiosk mode), optional mechanical tick sound, responsive auto-sizing, settings saved to `localStorage`

## Usage

Open `index.html` in any modern browser. That's it.

To serve it locally:

```bash
python3 -m http.server 4188
# then visit http://localhost:4188
```

> Shareable links and embeds require the page to be hosted somewhere (GitHub Pages, Netlify, etc.). The PNG export works anywhere, including from a local file.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` | Clock / Countdown / Message |
| `t` | Cycle color palette |
| `s` | Toggle sound |
| `f` | Fullscreen |

## License

[MIT](LICENSE)
