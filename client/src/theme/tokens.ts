export interface ThemePalette {
  nightSky: number;
  abyss: number;
  arcaneBlue: number;
  runeCyan: number;
  gold: number;
  ember: number;
  leaf: number;
  textPrimary: string;
  textMuted: string;
}

export interface ThemeTypography {
  titleSize: string;
  headingSize: string;
  bodySize: string;
  smallSize: string;
  titleFont: string;
  bodyFont: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeConfig {
  palette: ThemePalette;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
}

export const theme: ThemeConfig = {
  palette: {
    nightSky: 0x0a1228,
    abyss: 0x09040e,
    arcaneBlue: 0x274690,
    runeCyan: 0x5bc0eb,
    gold: 0xf4b942,
    ember: 0xff7f50,
    leaf: 0x7dd181,
    textPrimary: "#f7f2e8",
    textMuted: "#c9c0b4"
  },
  typography: {
    titleSize: "44px",
    headingSize: "28px",
    bodySize: "18px",
    smallSize: "14px",
    titleFont: "Georgia",
    bodyFont: "Trebuchet MS"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40
  }
};

export const rarityColors: Record<"common" | "rare" | "epic" | "legendary", number> = {
  common: 0xa0a6ad,
  rare: 0x59a8ff,
  epic: 0xb06cff,
  legendary: 0xffcc4d
};
