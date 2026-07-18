import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { supabase } from "../lib/supabase";
import {
  darkColors,
  fonts,
  lightColors,
  radius,
  spacing,
} from "../constants/theme";
import {
  isThemePreference,
  resolveStoredThemePreference,
  resolveTheme,
  Theme,
  ThemePreference,
} from "./themePreference";

export type { Theme, ThemePreference } from "./themePreference";

const THEME_PREFERENCE_STORAGE_KEY = "launchpad.themePreference";

export type ThemeColors = Record<keyof typeof lightColors, string>;
export type ThemeFonts = typeof fonts;
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;
export type ThemeShadows = ReturnType<typeof createThemeShadows>;

type ThemeContextValue = {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function createThemeShadows(colors: ThemeColors, theme: Theme) {
  return {
    glow: {
      shadowColor: colors.indigo,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
    glowCyan: {
      shadowColor: colors.indigo,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
    },
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme === "dark" ? 0.22 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
  } as const;
}

async function persistLocalPreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}

async function readRemotePreference(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("theme_preference")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return isThemePreference(data?.theme_preference)
    ? data.theme_preference
    : null;
}

async function writeRemotePreference(
  userId: string,
  preference: ThemePreference,
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      theme_preference: preference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setPreferenceState] =
    useState<ThemePreference>("light");
  const [isReady, setIsReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const preferenceChangeVersionRef = useRef(0);

  const applyRemotePreference = useCallback(async (userId: string) => {
    const versionAtStart = preferenceChangeVersionRef.current;

    try {
      const remotePreference = await readRemotePreference(userId);
      if (
        remotePreference &&
        versionAtStart === preferenceChangeVersionRef.current
      ) {
        setPreferenceState(remotePreference);
        await persistLocalPreference(remotePreference);
      }
    } catch (error) {
      console.warn("Could not load your saved theme preference.", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
      .then((storedPreference) => {
        if (!mounted) return;
        setPreferenceState(resolveStoredThemePreference(storedPreference));
      })
      .catch((error) => {
        console.warn("Could not load your local theme preference.", error);
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const userId = session?.user?.id ?? null;
      userIdRef.current = userId;
      if (userId) void applyRemotePreference(userId);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        return;
      }

      const userId = session?.user?.id ?? null;
      userIdRef.current = userId;
      if (userId && event === "SIGNED_IN") {
        void applyRemotePreference(userId);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyRemotePreference]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    preferenceChangeVersionRef.current += 1;
    setPreferenceState(preference);

    persistLocalPreference(preference).catch((error) => {
      console.warn("Could not save your theme preference on this device.", error);
    });

    const userId = userIdRef.current;
    if (userId) {
      writeRemotePreference(userId, preference).catch((error) => {
        console.warn("Could not sync your theme preference to your profile.", error);
      });
    }
  }, []);

  const theme = resolveTheme(themePreference, systemColorScheme);
  const colors: ThemeColors = theme === "dark" ? darkColors : lightColors;
  const shadows = useMemo(() => createThemeShadows(colors, theme), [colors, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themePreference,
      setThemePreference,
      colors,
      fonts,
      spacing,
      radius,
      shadows,
      isReady,
    }),
    [colors, isReady, setThemePreference, shadows, theme, themePreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
}
