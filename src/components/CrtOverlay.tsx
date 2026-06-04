// CRT overlay for the Pixel display: scanlines (with a subtle flicker) and a
// vignette. Chromatic aberration is applied to the glyphs via text-shadow (see
// `body.crt-on .pixel-board` in index.css). Pure CSS, no SVG/url() filters and
// no blend modes, so it stays cheap to composite.
export default function CrtOverlay() {
  return (
    <div className="crt-overlay" aria-hidden="true">
      <div className="crt-overlay__scanlines" />
      <div className="crt-overlay__vignette" />
    </div>
  );
}
