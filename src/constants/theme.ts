/**
 * Weatherly design tokens.
 * Colors are sampled from the exported brand assets in `assets/weatherly`.
 */

export const colors = {
  // Brand blue ramp
  blue: "#2F8AE5",
  blueLight: "#5EA9F2",
  blueDeep: "#1F6FCB",
  blueSoft: "#E8F1FC",
  blueTint: "#F1F6FD",

  // Weather colors
  sun: "#FFCC42",
  sunDeep: "#F5B419",
  cloud: "#E8F4FF",
  cloudMid: "#C4DCF2",
  cloudDeep: "#9EC3E4",
  rain: "#5AA9F0",
  snow: "#D9E9F7",
  storm: "#8B7BE8",

  // Neutrals
  background: "#F4F7FB",
  card: "#FFFFFF",
  text: "#172B43",
  textSoft: "#5B7290",
  textMuted: "#9AACC1",
  border: "#E7EDF5",
  field: "#EEF3F9",

  white: "#FFFFFF",
  black: "#0B1A2B",
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

const darkColors: ThemeColors = {
  ...colors,
  blueSoft: "#203A54",
  blueTint: "#1C3044",
  background: "#111A24",
  card: "#1B2937",
  text: "#F2F6FA",
  textSoft: "#B3C1CF",
  textMuted: "#8799AA",
  border: "#304152",
  field: "#243443",
  black: "#F2F6FA",
};

export function getThemeColors(dark: boolean): ThemeColors {
  return dark ? darkColors : colors;
}

export const gradients = {
  splash: ["#4BA3F0", "#2C7FDE", "#1F6FCB"],
  hero: ["#3F96EC", "#2A7FDF", "#2069CE"],
  primary: ["#4BA3F0", "#2A7FDF"],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Type scale — the design uses a geometric sans with tight headings. */
export const typography = {
  display: { fontSize: 58, lineHeight: 64, fontWeight: "200" },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700" },
  heading: { fontSize: 19, lineHeight: 24, fontWeight: "700" },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  small: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  tiny: { fontSize: 10, lineHeight: 13, fontWeight: "600" },
} as const;

export const shadow = {
  card: {
    shadowColor: "#123A66",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  soft: {
    shadowColor: "#123A66",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

/** Shared layout constants so every screen lines up with the design grid. */
export const layout = {
  gutter: 20,
  maxWidth: 520,
} as const;
