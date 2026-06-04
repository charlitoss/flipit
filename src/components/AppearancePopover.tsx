import { PALETTES, PALETTE_KEYS } from "../lib/palettes";
import { FONTS, FONT_CATEGORIES } from "../lib/fonts";
import { LED_COLORS } from "../lib/led";
import type { DisplayStyle } from "../lib/config";

interface Props {
  style: DisplayStyle;
  palette: string;
  font: string;
  ledColor: string;
  onSelectStyle: (s: DisplayStyle) => void;
  onSelectPalette: (key: string) => void;
  onSelectFont: (key: string) => void;
  onSelectLed: (key: string) => void;
}

export default function AppearancePopover({
  style,
  palette,
  font,
  ledColor,
  onSelectStyle,
  onSelectPalette,
  onSelectFont,
  onSelectLed,
}: Props) {
  const led = style === "led";
  return (
    <div id="palettePop" className="popover">
      <h3>Style</h3>
      <div className="seg small style-seg">
        <button className={style === "flip" ? "active" : ""} onClick={() => onSelectStyle("flip")}>
          Flip
        </button>
        <button className={led ? "active" : ""} onClick={() => onSelectStyle("led")}>
          LED
        </button>
      </div>

      {led ? (
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
      ) : (
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
