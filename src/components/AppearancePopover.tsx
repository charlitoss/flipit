import { PALETTES, PALETTE_KEYS } from "../lib/palettes";
import { FONTS, FONT_CATEGORIES } from "../lib/fonts";

interface Props {
  palette: string;
  font: string;
  onSelectPalette: (key: string) => void;
  onSelectFont: (key: string) => void;
}

export default function AppearancePopover({
  palette,
  font,
  onSelectPalette,
  onSelectFont,
}: Props) {
  return (
    <div id="palettePop" className="popover">
      <h3>Color</h3>
      <div className="swatches">
        {PALETTE_KEYS.map((key) => {
          const p = PALETTES[key];
          const style = {
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
              style={style}
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
    </div>
  );
}
