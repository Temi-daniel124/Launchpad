export const COLORS = {
  abyss: "#080E1A",
  navy: "#0F1729",
  elevated: "#162038",
  rim: "#1E2D4A",
  indigo: "#4F46E5",
  indigoLight: "#6366F1",
  cyan: "#06B6D4",
  gold: "#F59E0B",
  snow: "#F8FAFC",
  slate: "#94A3B8",
  fog: "#475569",
  emerald: "#10B981",
  rose: "#F43F5E",
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const FONTS = {
  display: "ClashDisplay",
  body: "Outfit",
  mono: "JetBrainsMono",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const SHADOWS = {
  glow: {
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
