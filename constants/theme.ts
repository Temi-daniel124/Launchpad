export const ACCENT_GREEN = "#159A63";

export const lightColors = {
  abyss: "#F7F9F8",
  navy: "#FFFFFF",
  elevated: "#F2F6F4",
  rim: "#DDE7E2",
  indigo: ACCENT_GREEN,
  indigoLight: "#20B978",
  cyan: "#159A63",
  gold: "#A66A00",
  snow: "#122017",
  slate: "#52645B",
  fog: "#7C8C84",
  emerald: "#159A63",
  rose: "#C2414B",
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const darkColors = {
  abyss: "#08110D",
  navy: "#101A15",
  elevated: "#17231D",
  rim: "#294035",
  indigo: "#3DDC91",
  indigoLight: "#62E5A8",
  cyan: "#3DDC91",
  gold: "#E1B15F",
  snow: "#F5FBF7",
  slate: "#A9B8AF",
  fog: "#708478",
  emerald: "#3DDC91",
  rose: "#FB7185",
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const fonts = {
  display: "ClashDisplay",
  body: "Outfit",
  mono: "JetBrainsMono",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 8,
  xl: 8,
  xxl: 8,
  full: 9999,
} as const;
