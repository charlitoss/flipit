import { PALETTES, PALETTE_KEYS } from "../lib/palettes";

interface Props {
  palette: string;
  onSelect: (key: string) => void;
}

export default function PalettePopover({ palette, onSelect }: Props) {
  return (
    <div id="palettePop" className="popover">
      <h3>Palette</h3>
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
              onClick={() => onSelect(key)}
            >
              <span className="sw-glyph">8</span>
              <span className="sw-hinge" />
              <span className="sw-dot" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
