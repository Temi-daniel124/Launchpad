import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import "../global.css";

SplashScreen.preventAutoHideAsync();

// Safety timeout , if fonts/auth take > 8s, hide splash anyway so app never freezes
const SPLASH_TIMEOUT_MS = 8000;

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const { setSession, fetchProfile } = useAuthStore();
  const { colors: COLORS, theme, isReady: themeReady } = useTheme();
  const initialLoadDone = useRef(false);
  const navigating = useRef(false);
  const splashHidden = useRef(false);
  const splashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fontsLoaded] = useFonts({
    ClashDisplay: require("../assets/fonts/ClashDisplay-Semibold.otf"),
    ClashDisplayBold: require("../assets/fonts/ClashDisplay-Bold.otf"),
    "Outfit-Light": require("../assets/fonts/Outfit-Light.ttf"),
    "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "JetBrainsMono-Regular": require("../assets/fonts/JetBrainsMono-Regular.ttf"),
  });

  const hideSplashSafe = () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current);
      splashTimeoutRef.current = null;
    }
    SplashScreen.hideAsync().catch(() => {});
  };

  // Safety: hide splash after timeout even if something hangs
  useEffect(() => {
    splashTimeoutRef.current = setTimeout(hideSplashSafe, SPLASH_TIMEOUT_MS);
    return () => {
      if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && themeReady) {
      hideSplashSafe();
    }
  }, [fontsLoaded, themeReady]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      initialLoadDone.current = true;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setSession(session);
        router.replace("/(auth)/reset-password");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        setSession(session);
        return;
      }

      if (event === "SIGNED_IN" && session && initialLoadDone.current) {
        setSession(session);
        if (session.user) {
          await fetchProfile(session.user.id);
        }

        if (navigating.current) return;
        navigating.current = true;

        try {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (profileRow?.onboarding_completed) {
            router.replace("/(tabs)/home");
          } else {
            router.replace("/(onboarding)/step1");
          }
        } catch {
          router.replace("/(onboarding)/step1");
        } finally {
          setTimeout(() => {
            navigating.current = false;
          }, 2000);
        }

        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        router.replace("/(auth)/welcome");
        return;
      }

      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
    });

    // -- AppState listener , re-validates session when app comes back to foreground
    // Prevents stale sessions and auth freeze after device sleep/resume
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!mounted) return;
          setSession(session);
          if (session?.user) fetchProfile(session.user.id);
        });
      }
    };

    const appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (!fontsLoaded || !themeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        style={theme === "dark" ? "light" : "dark"}
        backgroundColor={COLORS.abyss}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.abyss },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
