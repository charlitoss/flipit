import { PALETTES, PALETTE_KEYS } from "../lib/palettes";
import { FONTS, FONT_CATEGORIES } from "../lib/fonts";
import { LED_COLORS } from "../lib/led";
import { PIXEL_VARIANTS, PIXEL_COLORS } from "../lib/pixel";
import { MATRIX_COLORS, MATRIX_SHAPES } from "../lib/dotmatrix";
import type { DisplayStyle } from "../lib/config";

interface Props {
  style: DisplayStyle;
  palette: string;
  font: string;
  ledColor: string;
  pixelVariant: string;
  pixelColor: string;
  matrixColor: string;
  matrixShape: string;
  crtIntensity: number;
  onSelectStyle: (s: DisplayStyle) => void;
  onSelectPalette: (key: string) => void;
  onSelectFont: (key: string) => void;
  onSelectLed: (key: string) => void;
  onSelectPixel: (key: string) => void;
  onSelectPixelColor: (key: string) => void;
  onSelectMatrixColor: (key: string) => void;
  onSelectMatrixShape: (key: string) => void;
  onCrtIntensity: (v: number) => void;
}

export default function AppearancePopover({
  style,
  palette,
  font,
  ledColor,
  pixelVariant,
  pixelColor,
  matrixColor,
  matrixShape,
  crtIntensity,
  onSelectStyle,
  onSelectPalette,
  onSelectFont,
  onSelectLed,
  onSelectPixel,
  onSelectPixelColor,
  onCrtIntensity,
  onSelectMatrixColor,
  onSelectMatrixShape,
}: Props) {
  return (
    <div id="palettePop" className="popover">
      <h3>Style</h3>
      <div className="seg small style-seg">
        <button className={style === "flip" ? "active" : ""} onClick={() => onSelectStyle("flip")}>
          Flip
        </button>
        <button className={style === "led" ? "active" : ""} onClick={() => onSelectStyle("led")}>
          LED
        </button>
        <button className={style === "pixel" ? "active" : ""} onClick={() => onSelectStyle("pixel")}>
          CRT
        </button>
        <button className={style === "matrix" ? "active" : ""} onClick={() => onSelectStyle("matrix")}>
          Matrix
        </button>
      </div>

      {style === "led" && (
        <>
          <h3 className="appearance-section">Color</h3>
          <div className="led-swatches">
            {LED_COLORS.map((c) => (
              <button
                key={c.key}
                className={"led-swatch" + (ledColor === c.key ? " active" : "")}
                title={c.name}
                aria-label={c.name}
                style={{ ["--sw-on" as string]: c.on } as React.CSSProperties}
                onClick={() => onSelectLed(c.key)}
              >
                <span className="led-dot" />
              </button>
            ))}
          </div>
        </>
      )}

      {style === "pixel" && (
        <>
          <h3 className="appearance-section">Variant</h3>
          <div className="pixel-variants">
            {PIXEL_VARIANTS.map((v) => (
              <button
                key={v.key}
                className={"pixel-opt" + (pixelVariant === v.key ? " active" : "")}
                onClick={() => onSelectPixel(v.key)}
              >
                <span className="po-sample" style={{ fontFamily: `"${v.family}", monospace` }}>
                  A8
                </span>
                <span className="po-name">{v.name}</span>
              </button>
            ))}
          </div>

          <h3 className="appearance-section">Color</h3>
          <div className="led-swatches pixel-swatches">
            {PIXEL_COLORS.map((c) => (
              <button
                key={c.key}
                className={"led-swatch" + (pixelColor === c.key ? " active" : "")}
                title={c.name}
                aria-label={c.name}
                style={{ ["--sw-on" as string]: c.on } as React.CSSProperties}
                onClick={() => onSelectPixelColor(c.key)}
              >
                <span className="led-dot" />
              </button>
            ))}
          </div>

          <div className="appearance-slider">
            <span>CRT effect</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={crtIntensity}
              aria-label="CRT effect intensity"
              onChange={(e) => onCrtIntensity(+e.target.value)}
            />
          </div>
        </>
      )}

      {style === "matrix" && (
        <>
          <h3 className="appearance-section">Color</h3>
          <div className="led-swatches pixel-swatches">
            {MATRIX_COLORS.map((c) => (
              <button
                key={c.key}
                className={"led-swatch" + (matrixColor === c.key ? " active" : "")}
                title={c.name}
                aria-label={c.name}
                style={{ ["--sw-on" as string]: c.on } as React.CSSProperties}
                onClick={() => onSelectMatrixColor(c.key)}
              >
                <span className="led-dot" />
              </button>
            ))}
          </div>

          <h3 className="appearance-section">Cell shape</h3>
          <div className="pixel-variants">
            {MATRIX_SHAPES.map((s) => (
              <button
                key={s.key}
                className={"pixel-opt" + (matrixShape === s.key ? " active" : "")}
                onClick={() => onSelectMatrixShape(s.key)}
              >
                <span className="dm-shape-sample" style={{ borderRadius: `${s.radius * 100}%` }} />
                <span className="po-name">{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {style === "flip" && (
        <>
          <h3 className="appearance-section">Color</h3>
          <div className="swatches">
            {PALETTE_KEYS.map((key) => {
              const p = PALETTES[key];
              const sw = {
                background: `linear-gradient(180deg, ${p.vars["card-top"]}, ${p.vars["card-bot-2"]})`,
                ["--sw-glyph" as string]: p.vars.glyph,
                ["--sw-accent" as string]: p.vars.accent,
              } as React.CSSProperties;
              return (
                <button
                  key={key}
                  className={"swatch" + (palette === key ? " active" : "")}
                  title={p.name}
                  aria-label={p.name}
                  style={sw}
                  onClick={() => onSelectPalette(key)}
                >
                  <span className="sw-glyph">8</span>
                  <span className="sw-hinge" />
                  <span className="sw-dot" />
                </button>
              );
            })}
          </div>

          <h3 className="appearance-section">Font</h3>
          {FONT_CATEGORIES.map((cat) => (
            <div className="font-group" key={cat}>
              <div className="font-cat">{cat}</div>
              {FONTS.filter((f) => f.category === cat).map((f) => (
                <button
                  key={f.key}
                  className={"font-opt" + (font === f.key ? " active" : "")}
                  onClick={() => onSelectFont(f.key)}
                  style={{ fontFamily: f.stack, fontWeight: f.weight }}
                >
                  <span className="fo-name">{f.name}</span>
                  <span className="fo-sample">12:30</span>
                </button>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
