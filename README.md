# Flipit

A high-end split-flap (Solari) flip-board display — clock, countdown, and message modes with an authentic airport-style flutter. Built with **React + TypeScript + Vite**.

The split-flap mechanism is a small, framework-agnostic TypeScript engine (imperative DOM + CSS 3D transforms) that React mounts; the chrome (toolbar, settings, palette and export popovers) is regular React.

## Features

- **Three modes**
  - **Clock** — 12/24-hour, optional seconds, live date caption
  - **Countdown** — count down to a date & time or a quick H/M/S duration, with a custom "finished" label
  - **Message** — multi-line departure-board text (letters, numbers & `. , : ' ! ? - / & @ # % +`)
- **Three display styles** — the **Split-flap** (Solari) board, a **digital LED** 14-segment alphanumeric display (5 colors), or a **Geist Pixel** bitmap display (Square / Grid / Line variants)
- **Airport flutter** — each split-flap cell clatters through random characters and the board resolves in a left-to-right wave, just like a real Solari board. Editing a message only re-flips the letters that changed.
- **10 color palettes** — Onyx, Slate, Midnight, Forest, Crimson, Synthwave, Amber (dark) + Departures, Paper, Mint (light)
- **6 board fonts** (Google Fonts) across clean, condensed (Oswald, Archivo Narrow) and modern (Orbitron, Bungee) styles
- **Realistic flip animation** — 3D fold with hinge line, highlights and shadows
- **Export & share**
  - **Shareable link** — the full display state is encoded into a short URL (`#s=…`)
  - **Embed widget** — copy-paste `<iframe>` that renders a clean, chrome-free board (the link's `&e=1` flag)
  - **Image** — download the board as a PNG (drawn to canvas, retina resolution)
- **On-screen controls** — each mode's settings live in a bar on the page (no menus to dig through). All controls are hidden by default and reveal on mouse movement, then fade away when idle (kiosk mode); they stay put while you're interacting with them.
- **Premium touches** — fullscreen, optional mechanical tick sound, responsive auto-sizing, settings saved to `localStorage`

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

## SEO & analytics

The app is tuned for discoverability:

- **Meta tags** in `index.html`: title, description, canonical, Open Graph + Twitter cards, `theme-color`, and `WebApplication` JSON-LD structured data.
- **Social image** `public/og-image.png` (1200×630), plus `public/favicon.svg`, `public/icon-512.png` and `public/site.webmanifest`.
- **Crawling**: `public/robots.txt` and `public/sitemap.xml`.
- **Google Analytics (GA4)**: loaded inline in `index.html` (id `G-Q0SY22CC3C`). The network tag is skipped on `localhost`, so local development isn't tracked.
- **Vercel Speed Insights** (`@vercel/speed-insights`): real-user Core Web Vitals, collected automatically once deployed on Vercel (inert in local dev).

> **Changing the domain:** the canonical URL `https://flipit-tool.vercel.app/` is referenced in `index.html` (canonical, OG, Twitter, JSON-LD), `public/robots.txt`, and `public/sitemap.xml`. Update it in those files if the domain changes.

The social/icon images are generated from `tmp` HTML sources via headless Chrome — re-run only if you want to change the artwork.

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
    FlipBoard.tsx       Split-flap board: mounts the engine; runs the render loop
    LedBoard.tsx        Digital LED (14-segment) board
    LedChar.tsx         One 14-segment LED character
    PixelBoard.tsx      Geist Pixel (bitmap) board
    Toolbar.tsx         Mode switcher + tool buttons
    ModeControls.tsx    On-screen per-mode controls (clock / countdown / message)
    AppearancePopover.tsx  Combined color palette + board font picker
    ExportPopover.tsx   Share link, embed code, PNG download
    Icons.tsx           Inline SVG icons
  lib/
    flipEngine.ts       Framework-agnostic split-flap engine (Unit + Board)
    segments.ts         14-segment LED geometry + character map
    display.ts          Per-mode rendering (clock / countdown / message strings)
    palettes.ts         The 10 color palettes
    fonts.ts            The board font catalog (Google Fonts)
    config.ts           Types, defaults, URL encode/decode, persistence
    exportImage.ts      Canvas PNG export + share/embed string building
    sound.ts            WebAudio mechanical tick
    chars.ts            Character set + flutter helpers
```

## License

[MIT](LICENSE)
