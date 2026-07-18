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

export function resolveRemoteThemePreference(
  preference: unknown,
  explicitSetAt: unknown,
): ThemePreference | null {
  if (!isThemePreference(preference)) return null;
  if (typeof explicitSetAt !== "string" || explicitSetAt.trim().length === 0) {
    return null;
  }

  return preference;
}

export function isMissingThemePreferenceSetAtError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("theme_preference_set_at")
  );
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
