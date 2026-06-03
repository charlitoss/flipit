# Flipit

A high-end split-flap (Solari) flip-board display — clock, countdown, and message modes with an authentic airport-style flutter. Built with **React + TypeScript + Vite**.

The split-flap mechanism is a small, framework-agnostic TypeScript engine (imperative DOM + CSS 3D transforms) that React mounts; the chrome (toolbar, settings, palette and export popovers) is regular React.

## Features

- **Three modes**
  - **Clock** — 12/24-hour, optional seconds, live date caption
  - **Countdown** — count down to a date & time or a quick H/M/S duration, with a custom "finished" label
  - **Message** — multi-line departure-board text (letters, numbers & `. , : ' ! ? - / & @ # % +`)
- **Airport flutter** — each cell clatters through random characters and the board resolves in a left-to-right wave, just like a real Solari board. Editing a message only re-flips the letters that changed.
- **10 color palettes** — Onyx, Slate, Midnight, Forest, Crimson, Synthwave, Amber (dark) + Departures, Paper, Mint (light)
- **Realistic flip animation** — 3D fold with hinge line, highlights and shadows
- **Export & share**
  - **Shareable link** — the full display state is encoded into a short URL (`#s=…`)
  - **Embed widget** — copy-paste `<iframe>` that renders a clean, chrome-free board (the link's `&e=1` flag)
  - **Image** — download the board as a PNG (drawn to canvas, retina resolution)
- **Premium touches** — fullscreen, auto-hiding controls (kiosk mode), optional mechanical tick sound, responsive auto-sizing, settings saved to `localStorage`

## Getting started

Requires Node 18+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (http://localhost:5173)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

> Shareable links and embeds require the page to be hosted somewhere (GitHub Pages, Netlify, etc.). The PNG export works anywhere.

### Deploying to GitHub Pages

The build uses a relative base path (`base: "./"` in `vite.config.ts`), so the contents of `dist/` can be served from any sub-path. Build with `npm run build` and publish the `dist/` folder.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` | Clock / Countdown / Message |
| `t` | Cycle color palette |
| `s` | Toggle sound |
| `f` | Fullscreen |

## Project structure

```
index.html              Vite entry
src/
  main.tsx              React bootstrap
  App.tsx               State, effects, and chrome orchestration
  index.css             Global styles + CSS variables
  components/
    FlipBoard.tsx       Mounts the engine; runs the per-mode render loop
    Toolbar.tsx         Mode switcher + tool buttons
    SettingsPanel.tsx   Per-mode settings (clock / countdown / message)
    PalettePopover.tsx  Palette swatches
    ExportPopover.tsx   Share link, embed code, PNG download
    Icons.tsx           Inline SVG icons
  lib/
    flipEngine.ts       Framework-agnostic split-flap engine (Unit + Board)
    display.ts          Per-mode rendering (clock / countdown / message strings)
    palettes.ts         The 10 color palettes
    config.ts           Types, defaults, URL encode/decode, persistence
    exportImage.ts      Canvas PNG export + share/embed string building
    sound.ts            WebAudio mechanical tick
    chars.ts            Character set + flutter helpers
```

## License

[MIT](LICENSE)
