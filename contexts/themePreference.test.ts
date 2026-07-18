import {
  isThemePreference,
  resolveRemoteThemePreference,
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
assertEqual(resolveRemoteThemePreference("dark", null), null, "remote dark without explicit timestamp is ignored");
assertEqual(resolveRemoteThemePreference("light", ""), null, "remote light without explicit timestamp is ignored");
assertEqual(resolveRemoteThemePreference("dark", "2026-07-18T12:00:00.000Z"), "dark", "remote dark with explicit timestamp is accepted");
assertEqual(resolveRemoteThemePreference("system", "2026-07-18T12:00:00.000Z"), "system", "remote system with explicit timestamp is accepted");
assertEqual(resolveTheme("system", "dark"), "dark", "system preference follows dark system scheme");
assertEqual(resolveTheme("system", null), "light", "null system scheme resolves to light");
assertEqual(isThemePreference("light"), true, "light validates as a theme preference");
assertEqual(isThemePreference("blue"), false, "unknown strings do not validate as preferences");
