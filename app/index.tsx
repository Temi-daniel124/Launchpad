import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { ProgressState } from "../components/ui/ProgressState";

export default function Index() {
  const { session, profile, isLoading } = useAuthStore();
  const hasNavigated = useRef(false);

  const navigate = (path: string) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace(path as any);
  };

  useEffect(() => {
    // Don't do anything while auth is still loading
    if (isLoading) return;

    // No session to welcome screen
    if (!session) {
      navigate("/(auth)/welcome");
      return;
    }

    // Session exists but profile hasn't loaded yet , wait for it.
    // Reduced from 8 seconds to 3 seconds to avoid perceived infinite loading.
    // On timeout: check DB one more time before giving up.
    if (profile === null) {
      const timer = setTimeout(async () => {
        if (hasNavigated.current) return;

        // One final attempt to fetch the profile directly
        try {
          const { data } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (data) {
            // Profile exists , route based on onboarding status
            navigate(
              data.onboarding_completed
                ? "/(tabs)/home"
                : "/(onboarding)/step1",
            );
          } else {
            // No profile yet (new Google/OAuth user, trigger may be slow)
            // Route to step1 instead of sign-in to avoid confusing loop
            navigate("/(onboarding)/step1");
          }
        } catch {
          // DB error , route to onboarding for new users, not sign-in
          navigate("/(onboarding)/step1");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Profile is loaded , route based on onboarding status
    if (profile.onboarding_completed) {
      navigate("/(tabs)/home");
    } else {
      navigate("/(onboarding)/step1");
    }
  }, [isLoading, session, profile]);

  return (
    <ProgressState
      title="Opening Launchpad"
      steps={[
        "Checking your sign-in session",
        "Reading your profile",
        "Sending you to the right screen",
      ]}
      activeStep={isLoading ? 0 : session && !profile ? 1 : 2}
    />
  );
}
