// CRT overlay for the Pixel display: scanlines, RGB sub-pixel stripes, a faint
// flicker and a vignette, plus a chromatic-aberration SVG filter applied to the
// board (see `body.pixel-mode #stage` in index.css). Pure CSS + SVG, no shaders.
const SHIFT = 0.6; // px of red/blue chromatic aberration

export default function CrtOverlay() {
  return (
    <>
      <svg className="crt-svg-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="crt-rgb-shift" x="-2%" y="-2%" width="104%" height="104%">
            <feOffset in="SourceGraphic" dx={-SHIFT} dy="0" result="r-shift" />
            <feColorMatrix
              in="r-shift"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="r"
            />
            <feOffset in="SourceGraphic" dx={SHIFT} dy="0" result="b-shift" />
            <feColorMatrix
              in="b-shift"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="b"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="g"
            />
            <feBlend in="r" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div className="crt-overlay" aria-hidden="true">
        <div className="crt-overlay__scanlines" />
        <div className="crt-overlay__flicker" />
        <div className="crt-overlay__vignette" />
      </div>
    </>
  );
}
