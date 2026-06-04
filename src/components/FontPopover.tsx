import { FONTS, FONT_CATEGORIES } from "../lib/fonts";

interface Props {
  font: string;
  onSelect: (key: string) => void;
}

export default function FontPopover({ font, onSelect }: Props) {
  return (
    <div id="fontPop" className="popover">
      <h3>Font</h3>
      {FONT_CATEGORIES.map((cat) => (
        <div key={cat}>
          <div className="font-cat">{cat}</div>
          {FONTS.filter((f) => f.category === cat).map((f) => (
            <button
              key={f.key}
              className={"font-opt" + (font === f.key ? " active" : "")}
              onClick={() => onSelect(f.key)}
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
