export interface Palette {
  name: string;
  light: boolean;
  vars: Record<string, string>;
}

// `light: true` flips the UI chrome (controls/panels) to dark-on-light.
export const PALETTES: Record<string, Palette> = {
  onyx: {
    name: "Onyx",
    light: false,
    vars: {
      "bg-0": "#0a0a0c", "bg-1": "#141417", "card-top": "#2c2d31", "card-top-2": "#232428",
      "card-bot": "#1b1c1f", "card-bot-2": "#141518", glyph: "#f4f4f5", "glyph-shadow": "rgba(0,0,0,.55)",
      hinge: "#050506", "hinge-hi": "rgba(255,255,255,.06)", accent: "#e8b84b",
    },
  },
  slate: {
    name: "Slate",
    light: false,
    vars: {
      "bg-0": "#0d0f12", "bg-1": "#161a20", "card-top": "#2b313b", "card-top-2": "#222730",
      "card-bot": "#191d24", "card-bot-2": "#11141a", glyph: "#f0f3f7", "glyph-shadow": "rgba(0,0,0,.5)",
      hinge: "#04060a", "hinge-hi": "rgba(255,255,255,.07)", accent: "#7dd3fc",
    },
  },
  midnight: {
    name: "Midnight",
    light: false,
    vars: {
      "bg-0": "#060a14", "bg-1": "#0c1426", "card-top": "#1c2a44", "card-top-2": "#152135",
      "card-bot": "#101a2c", "card-bot-2": "#0a1220", glyph: "#eaf0ff", "glyph-shadow": "rgba(0,0,0,.55)",
      hinge: "#03060d", "hinge-hi": "rgba(120,160,255,.1)", accent: "#4d8dff",
    },
  },
  forest: {
    name: "Forest",
    light: false,
    vars: {
      "bg-0": "#060c08", "bg-1": "#0c160f", "card-top": "#1d2e22", "card-top-2": "#16241a",
      "card-bot": "#111d15", "card-bot-2": "#0b140e", glyph: "#eefaf0", "glyph-shadow": "rgba(0,0,0,.55)",
      hinge: "#030704", "hinge-hi": "rgba(120,220,150,.1)", accent: "#46c97e",
    },
  },
  crimson: {
    name: "Crimson",
    light: false,
    vars: {
      "bg-0": "#120607", "bg-1": "#1f0c0e", "card-top": "#3a1f23", "card-top-2": "#2d181b",
      "card-bot": "#221215", "card-bot-2": "#160b0d", glyph: "#fff0f1", "glyph-shadow": "rgba(0,0,0,.55)",
      hinge: "#0a0405", "hinge-hi": "rgba(255,140,150,.1)", accent: "#ff5d6c",
    },
  },
  synthwave: {
    name: "Synthwave",
    light: false,
    vars: {
      "bg-0": "#0c0618", "bg-1": "#160a2b", "card-top": "#2a1a45", "card-top-2": "#201338",
      "card-bot": "#190f2c", "card-bot-2": "#100820", glyph: "#fdeaff", "glyph-shadow": "rgba(0,0,0,.5)",
      hinge: "#060312", "hinge-hi": "rgba(255,120,220,.12)", accent: "#f062d6",
    },
  },
  amber: {
    name: "Amber",
    light: false,
    vars: {
      "bg-0": "#0a0805", "bg-1": "#14100a", "card-top": "#2a2118", "card-top-2": "#201910",
      "card-bot": "#181208", "card-bot-2": "#0f0b05", glyph: "#ffb627", "glyph-shadow": "rgba(0,0,0,.6)",
      hinge: "#000000", "hinge-hi": "rgba(255,180,40,.12)", accent: "#ffb627",
    },
  },
  departures: {
    name: "Departures",
    light: true,
    vars: {
      "bg-0": "#d9dadd", "bg-1": "#c4c5c9", "card-top": "#fbfbfc", "card-top-2": "#ececed",
      "card-bot": "#e3e3e5", "card-bot-2": "#d3d3d6", glyph: "#18181b", "glyph-shadow": "rgba(0,0,0,.12)",
      hinge: "rgba(0,0,0,.28)", "hinge-hi": "rgba(255,255,255,.7)", accent: "#d9952a",
    },
  },
  paper: {
    name: "Paper",
    light: true,
    vars: {
      "bg-0": "#e9e2d4", "bg-1": "#d8cdb8", "card-top": "#fdfaf3", "card-top-2": "#f1e9da",
      "card-bot": "#e7ddcb", "card-bot-2": "#d7cab2", glyph: "#2a2118", "glyph-shadow": "rgba(0,0,0,.1)",
      hinge: "rgba(0,0,0,.22)", "hinge-hi": "rgba(255,255,255,.75)", accent: "#c2752a",
    },
  },
  mint: {
    name: "Mint",
    light: true,
    vars: {
      "bg-0": "#dfeae5", "bg-1": "#cadbd3", "card-top": "#fbfdfc", "card-top-2": "#e9f2ee",
      "card-bot": "#dde9e4", "card-bot-2": "#ccddd6", glyph: "#103a2c", "glyph-shadow": "rgba(0,0,0,.1)",
      hinge: "rgba(0,0,0,.22)", "hinge-hi": "rgba(255,255,255,.7)", accent: "#0fa672",
    },
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES);

// Apply a palette's colors as CSS variables on <body> and flag light chrome.
export function applyPaletteVars(palette: string): void {
  const pal = PALETTES[palette] || PALETTES.onyx;
  for (const [k, v] of Object.entries(pal.vars)) {
    document.body.style.setProperty("--" + k, v);
  }
  document.body.classList.toggle("light", !!pal.light);
}
