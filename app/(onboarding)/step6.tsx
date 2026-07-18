import React, { useState, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { GlassCard } from "../../components/ui/GlassCard";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { LinkedinLogo } from "phosphor-react-native";

export default function Step6Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleNext = async () => {
    if (linkedinUrl && !linkedinUrl.includes("linkedin.com")) {
      return showToast(
        "Enter a valid LinkedIn URL (linkedin.com/in/...)",
        "error",
      );
    }
    setLoading(true);
    if (linkedinUrl.trim()) {
      await updateProfile({ linkedin_url: linkedinUrl.trim() });
    }
    setLoading(false);
    router.push("/(onboarding)/step7");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(10,102,194,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <OnboardingProgress currentStep={6} totalSteps={7} />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <View style={{ height: 16 }} />
          <View style={styles.iconRow}>
            <LinearGradient
              colors={["rgba(10,102,194,0.25)", "rgba(10,102,194,0.08)"]}
              style={styles.iconGradient}
            >
              <LinkedinLogo size={32} color="#0A66C2" weight="fill" />
            </LinearGradient>
          </View>

          <Text variant="h1" style={{ marginBottom: 8 }}>
            LinkedIn Profile
          </Text>
          <Text variant="bodyLarge" style={{ marginBottom: 24 }}>
            Your LinkedIn URL is added to your portfolio and used in DM drafts
            for job applications.
          </Text>

          <GlassCard style={{ marginBottom: 24 }} padding={14}>
            <Text variant="caption" color={COLORS.slate}>
              Example:{" "}
              <Text variant="mono">https://linkedin.com/in/yourname</Text>
            </Text>
          </GlassCard>

          <InputField
            label="LinkedIn Profile URL"
            value={linkedinUrl}
            onChangeText={setLinkedinUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={{ flex: 1 }} />

          <View style={{ gap: 12, paddingBottom: 32 }}>
            <Button
              title="Continue"
              onPress={handleNext}
              loading={loading}
              size="lg"
            />
            <Button
              title="Skip for now"
              onPress={() => router.push("/(onboarding)/step7")}
              variant="ghost"
              size="lg"
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  iconRow: { marginBottom: 24, alignSelf: "flex-start" },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(10,102,194,0.2)",
  },
});
