import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { GlassCard } from "../../components/ui/GlassCard";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import {
  GithubLogo,
  CheckCircle,
  Lightning,
  Info,
} from "phosphor-react-native";

export default function Step5Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { updateProfile, user } = useAuthStore();
  const { showToast } = useUIStore();
  const [githubUsername, setGithubUsername] = useState("");
  const [githubProfile, setGithubProfile] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Verify username exists on GitHub via public API
  const verifyManually = async () => {
    const trimmed = githubUsername.trim();
    if (!trimmed) return;
    setVerifying(true);
    try {
      const response = await fetch(`https://api.github.com/users/${trimmed}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "LaunchpadApp/1.0",
        },
      });
      if (!response.ok) throw new Error("GitHub user not found");
      const data = await response.json();
      setGithubProfile(data);
      await updateProfile({ github_username: trimmed });
      showToast("GitHub profile found and saved!", "success");
      setVerified(true);
    } catch {
      showToast(
        "GitHub username not found. Check the exact spelling , it is case-sensitive.",
        "error",
      );
      setGithubProfile(null);
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    // Save username even if not verified (user may have typed it correctly)
    if (githubUsername.trim() && !verified) {
      await updateProfile({ github_username: githubUsername.trim() });
    }
    setLoading(false);
    router.push("/(onboarding)/step6");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim, flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <OnboardingProgress currentStep={5} totalSteps={7} />

          <View style={styles.iconBox}>
            <GithubLogo size={36} color={COLORS.snow} weight="fill" />
          </View>

          <Text variant="h1" style={{ marginBottom: 8 }}>
            Connect GitHub
          </Text>
          <Text
            variant="body"
            color={COLORS.slate}
            style={{ marginBottom: 24 }}
          >
            Link your GitHub so we can source your real projects for your
            portfolio. Enter your exact username , it is case-sensitive.
          </Text>

          {/* Info box explaining how GitHub is used */}
          <GlassCard
            padding={14}
            style={{ marginBottom: 24, borderColor: "rgba(21,154,99,0.12)" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Info
                size={16}
                color={COLORS.indigo}
                weight="fill"
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="label"
                  color={COLORS.snow}
                  style={{ marginBottom: 4 }}
                >
                  What your GitHub username is used for
                </Text>
                <Text variant="caption" color={COLORS.fog}>
                  Your public repositories are fetched and shown as projects on
                  your portfolio website. We never write to your GitHub or
                  modify any repository.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Verified state */}
          {verified && githubProfile ? (
            <GlassCard style={{ marginBottom: 24 }} padding={16}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <CheckCircle size={24} color={COLORS.emerald} weight="fill" />
                <View style={{ flex: 1 }}>
                  <Text variant="label" color={COLORS.snow}>
                    GitHub Connected
                  </Text>
                  <Text variant="caption" color={COLORS.emerald}>
                    @{githubProfile.login} - {githubProfile.public_repos ?? 0}{" "}
                    public repos
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setVerified(false);
                    setGithubProfile(null);
                    setGithubUsername("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text variant="caption" color={COLORS.fog}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <>
              <InputField
                label="GitHub Username"
                placeholder="e.g. johndoe"
                value={githubUsername}
                onChangeText={(text) => {
                  setGithubUsername(text.trim());
                  setVerified(false);
                  setGithubProfile(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text
                variant="caption"
                color={COLORS.fog}
                style={{
                  marginTop: -8,
                  marginBottom: 16,
                  paddingHorizontal: 2,
                }}
              >
                Find your username at github.com/YOUR_USERNAME , it is
                case-sensitive. Example: if your profile is at
                github.com/johndoe, enter johndoe
              </Text>

              {githubUsername.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={verifyManually}
                  activeOpacity={0.8}
                  disabled={verifying}
                >
                  <Lightning size={16} color={COLORS.indigo} weight="fill" />
                  <Text
                    variant="label"
                    color={COLORS.indigo}
                    style={{ marginLeft: 8 }}
                  >
                    {verifying ? "Verifying..." : "Verify Username"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <Text
            variant="caption"
            color={COLORS.fog}
            align="center"
            style={{ marginTop: 8, marginBottom: 32 }}
          >
            Without GitHub, your portfolio will show placeholder projects.
          </Text>

          <View style={{ gap: 12 }}>
            <Button
              title="Continue"
              onPress={handleNext}
              loading={loading}
              size="lg"
            />
            <Button
              title="Skip for now"
              onPress={() => router.push("/(onboarding)/step6")}
              variant="ghost"
              size="lg"
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.indigo}55`,
    backgroundColor: `${COLORS.indigo}11`,
  },
});
