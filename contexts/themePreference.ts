import type { ColorSchemeName } from "react-native";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const THEME_PREFERENCES = new Set<string>(["light", "dark", "system"]);

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEME_PREFERENCES.has(value);
}

export function resolveStoredThemePreference(value: string | null): ThemePreference {
  return isThemePreference(value) ? value : "light";
}

export function resolveTheme(
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName,
): Theme {
  if (preference === "system") {
    return systemColorScheme === "dark" ? "dark" : "light";
  }

  return preference;
}
