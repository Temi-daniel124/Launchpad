import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../constants/theme";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Handle token-based callback (Supabase magic link / email)
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      // Wait for Supabase to process the OAuth callback
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const meta = session.user?.user_metadata || {};

        // Extract GitHub username from all possible metadata fields
        const githubUsername =
          meta.user_name || meta.preferred_username || meta.login || "";

        const providerToken = session.provider_token || "";

        // Save GitHub data to profile if we got a username
        if (githubUsername) {
          await supabase
            .from("profiles")
            .update({
              github_username: githubUsername,
              github_token: providerToken || undefined,
            })
            .eq("id", session.user.id);

          // Navigate forward in onboarding — NOT back to step 1
          router.replace("/(onboarding)/step6");
        } else {
          // Logged in but no GitHub data — could be email/magic link
          // Check if onboarding is complete
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (profile?.onboarding_completed) {
            router.replace("/(tabs)/home");
          } else {
            router.replace("/(onboarding)/step6");
          }
        }
      } else {
        // No session — GitHub OAuth failed, send back to step 5 to retry
        router.replace("/(onboarding)/step5");
      }
    } catch (error) {
      console.error("Auth callback error:", error);
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.abyss,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator color={COLORS.indigo} size="large" />
    </View>
  );
}
