import {
  isThemePreference,
  resolveTheme,
  resolveStoredThemePreference,
} from "./themePreference";

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, received ${actual}`);
  }
}

assertEqual(resolveStoredThemePreference(null), "light", "missing preference defaults to light");
assertEqual(resolveStoredThemePreference("system"), "system", "system is a valid stored preference");
assertEqual(resolveStoredThemePreference("dark"), "dark", "dark is a valid stored preference");
assertEqual(resolveStoredThemePreference("unexpected"), "light", "invalid preference defaults to light");
assertEqual(resolveTheme("system", "dark"), "dark", "system preference follows dark system scheme");
assertEqual(resolveTheme("system", null), "light", "null system scheme resolves to light");
assertEqual(isThemePreference("light"), true, "light validates as a theme preference");
assertEqual(isThemePreference("blue"), false, "unknown strings do not validate as preferences");
