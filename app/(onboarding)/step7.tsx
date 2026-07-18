import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { GlassCard } from "../../components/ui/GlassCard";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import {
  Bell,
  Shield,
  CheckSquare,
  Square,
  Robot,
  Info,
  Warning,
} from "phosphor-react-native";

export default function Step7Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { updateProfile, profile } = useAuthStore();
  const { showToast } = useUIStore();
  const [dataConsent, setDataConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplyConsent, setAutoApplyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const requestNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      setNotifEnabled(true);
      showToast("Notifications enabled", "success");
    }
  };

  const handleToggleAutoApply = () => {
    const next = !autoApplyEnabled;
    setAutoApplyEnabled(next);
    if (!next) setAutoApplyConsent(false);

    // Advise user to create international CV if no CVs exist
    if (next && !profile?.portfolio_url) {
      // The advice will show in the info box below , no toast needed
    }
  };

  const handleFinish = async () => {
    if (!dataConsent)
      return showToast("Please accept the data processing consent", "error");
    if (!termsAccepted)
      return showToast(
        "Please accept the Terms of Service and Privacy Policy",
        "error",
      );

    if (autoApplyEnabled && !autoApplyConsent) {
      return showToast(
        "Please accept the Auto Apply consent to enable this feature",
        "error",
      );
    }

    setLoading(true);
    try {
      await updateProfile({
        data_consent_given: true,
        data_consent_timestamp: new Date().toISOString(),
        auto_apply_enabled: autoApplyEnabled && autoApplyConsent,
        auto_apply_consent_given: autoApplyEnabled && autoApplyConsent,
        auto_apply_consent_timestamp:
          autoApplyEnabled && autoApplyConsent
            ? new Date().toISOString()
            : null,
        onboarding_completed: true,
      });
      router.replace("/(onboarding)/trial-activated");
    } catch (err) {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const CheckItem = ({
    label,
    checked,
    onPress,
    color = COLORS.indigo,
    children,
  }: any) => (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {checked ? (
        <CheckSquare size={22} color={color} weight="fill" />
      ) : (
        <Square size={22} color={COLORS.fog} />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {children || (
          <Text variant="body" style={{ lineHeight: 20 }}>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <OnboardingProgress currentStep={7} totalSteps={7} />
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 16 }} />
          <View style={styles.iconRow}>
            <LinearGradient
              colors={["rgba(16,185,129,0.2)", "rgba(16,185,129,0.05)"]}
              style={styles.iconGradient}
            >
              <Shield size={32} color={COLORS.emerald} weight="duotone" />
            </LinearGradient>
          </View>

          <Text variant="h1" style={{ marginBottom: 8 }}>
            Almost there
          </Text>
          <Text
            variant="bodyLarge"
            color={COLORS.slate}
            style={{ marginBottom: 24 }}
          >
            A few final steps before your career launches.
          </Text>

          {/* -- Notifications ----------------------------------------- */}
          <GlassCard style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Bell size={20} color={COLORS.gold} weight="duotone" />
              <Text variant="label" color={COLORS.snow}>
                Enable Job Alerts
              </Text>
            </View>
            <Text
              variant="body"
              color={COLORS.slate}
              style={{ marginBottom: 14 }}
            >
              Get notified instantly when new matched jobs arrive. Never miss an
              opportunity.
            </Text>
            <Button
              title={
                notifEnabled ? "Notifications Enabled" : "Enable Notifications"
              }
              onPress={requestNotifications}
              variant={notifEnabled ? "ghost" : "primary"}
              size="sm"
              fullWidth={false}
              disabled={notifEnabled}
            />
          </GlassCard>

          {/* -- Auto Apply -------------------------------------------- */}
          <GlassCard style={{ marginBottom: 12 }}>
            {/* Header toggle */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
              onPress={handleToggleAutoApply}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  autoApplyEnabled
                    ? ["rgba(21,154,99,0.2)", "rgba(21,154,99,0.05)"]
                    : ["rgba(71,85,105,0.2)", "rgba(71,85,105,0.05)"]
                }
                style={styles.autoApplyIcon}
              >
                <Robot
                  size={20}
                  color={autoApplyEnabled ? COLORS.cyan : COLORS.fog}
                  weight="duotone"
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="label" color={COLORS.snow}>
                    Auto Apply
                  </Text>
                  {/* Toggle pill */}
                  <View
                    style={[
                      styles.togglePill,
                      autoApplyEnabled && styles.togglePillActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        autoApplyEnabled && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </View>
                <Text
                  variant="caption"
                  color={COLORS.slate}
                  style={{ marginTop: 4, lineHeight: 18 }}
                >
                  Launchpad automatically sends personalised email applications
                  to hiring managers when a matching role is found.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expanded content when enabled */}
            {autoApplyEnabled && (
              <View style={{ marginTop: 16 }}>
                <View style={styles.divider} />

                {/* How it works */}
                <View style={styles.infoBox}>
                  <Info size={14} color={COLORS.cyan} weight="fill" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      variant="caption"
                      color={COLORS.cyan}
                      style={{ fontWeight: "700", marginBottom: 4 }}
                    >
                      How Auto Apply works
                    </Text>
                    <Text
                      variant="caption"
                      color={COLORS.slate}
                      style={{ lineHeight: 18 }}
                    >
                      1. When a job match is found, Launchpad locates the hiring
                      manager's email via Hunter.io{"\n"}
                      2. Your best matching CV is selected automatically based
                      on the job location{"\n"}
                      3. A personalised cover letter is generated using your
                      profile and CV{"\n"}
                      4. The application is sent with your CV attached and
                      reply-to set to your email{"\n"}
                      5. Replies from hiring managers land directly in your
                      inbox{"\n"}
                      6. The job appears in your app under "Applied" with an
                      Auto label
                    </Text>
                  </View>
                </View>

                {/* CV advice */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: "rgba(245,158,11,0.06)",
                      borderColor: "rgba(245,158,11,0.2)",
                      marginTop: 10,
                    },
                  ]}
                >
                  <Warning size={14} color={COLORS.gold} weight="fill" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      variant="caption"
                      color={COLORS.gold}
                      style={{ fontWeight: "700", marginBottom: 4 }}
                    >
                      Recommendation
                    </Text>
                    <Text
                      variant="caption"
                      color={COLORS.slate}
                      style={{ lineHeight: 18 }}
                    >
                      We strongly recommend creating an International CV from
                      the CV Builder. It is the most versatile format and will
                      be used as a fallback when no region-specific CV exists.
                      You can create your CVs after completing onboarding.
                    </Text>
                  </View>
                </View>

                {/* Consent checkbox */}
                <View style={{ marginTop: 14 }}>
                  <CheckItem
                    checked={autoApplyConsent}
                    onPress={() => setAutoApplyConsent(!autoApplyConsent)}
                    color={COLORS.cyan}
                  >
                    <Text variant="body" style={{ lineHeight: 20 }}>
                      I authorise Launchpad to send job applications on my
                      behalf using my profile, CV, and generated cover letters.
                      I understand I can disable this at any time from Profile
                      Settings.
                    </Text>
                  </CheckItem>
                </View>
              </View>
            )}
          </GlassCard>

          {/* -- Legal Checkboxes --------------------------------------- */}
          <GlassCard style={{ marginBottom: 24 }}>
            <CheckItem
              label="I consent to Launchpad processing my career data to generate my portfolio, match jobs, and create my CV. I can delete my data at any time."
              checked={dataConsent}
              onPress={() => setDataConsent(!dataConsent)}
              color={COLORS.emerald}
            />
            <View style={styles.divider} />
            <CheckItem
              checked={termsAccepted}
              onPress={() => setTermsAccepted(!termsAccepted)}
              color={COLORS.indigo}
            >
              <View>
                <Text variant="body" style={{ lineHeight: 20 }}>
                  I agree to the{" "}
                  <Text
                    variant="body"
                    color={COLORS.indigo}
                    style={{ textDecorationLine: "underline" }}
                    onPress={() =>
                      Linking.openURL("https://launchpad-legal.vercel.app/")
                    }
                  >
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text
                    variant="body"
                    color={COLORS.indigo}
                    style={{ textDecorationLine: "underline" }}
                    onPress={() =>
                      Linking.openURL("https://launchpad-legal.vercel.app/")
                    }
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </CheckItem>
          </GlassCard>

          <Button
            title="Launch My Career"
            onPress={handleFinish}
            loading={loading}
            size="lg"
          />
          <View style={{ height: 16 }} />
        </Animated.ScrollView>
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
    borderColor: "rgba(16,185,129,0.2)",
  },
  autoApplyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.rim,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  togglePillActive: {
    backgroundColor: COLORS.cyan,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.fog,
  },
  toggleThumbActive: {
    backgroundColor: COLORS.snow,
    marginLeft: "auto" as any,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: COLORS.rim, marginVertical: 14 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(21,154,99,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.2)",
    padding: 14,
  },
});
