import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { GlassCard } from "../../../components/ui/GlassCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { useTheme, type ThemeColors, type ThemePreference, type ThemeRadius, type ThemeShadows } from "../../../contexts/ThemeContext";
import { requestNotificationPermissions } from "../../../lib/notifications";
import {
  User,
  Crown,
  Shield,
  Bell,
  SignOut,
  Trash,
  CaretRight,
  GithubLogo,
  LinkedinLogo,
  Globe,
  Envelope,
  ArrowSquareOut,
  Info,
  Lock,
} from "phosphor-react-native";

export default function ProfileScreen() {
  const {
    colors: COLORS,
    radius: RADIUS,
    shadows: SHADOWS,
    theme,
    themePreference,
    setThemePreference,
  } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { profile, signOut, user } = useAuthStore();
  const { showToast } = useUIStore();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const getSubscriptionInfo = () => {
    if (profile?.subscription_status === "active") {
      return {
        label: "Pro",
        variant: "gold" as const,
        desc: `${profile.subscription_plan === "annual" ? "Annual" : "Monthly"} plan`,
      };
    }
    if (profile?.subscription_status === "trial") {
      const days = Math.max(
        0,
        Math.ceil(
          (new Date(profile.trial_ends_at!).getTime() - Date.now()) / 86400000,
        ),
      );
      return {
        label: "Free Trial",
        variant: "info" as const,
        desc: `${days} days remaining`,
      };
    }
    return {
      label: "Expired",
      variant: "error" as const,
      desc: "Upgrade to continue",
    };
  };

  const subInfo = getSubscriptionInfo();
  const themeOptions: { key: ThemePreference; label: string }[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "System" },
  ];

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
          // index.tsx will pick up session === null and redirect to welcome
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes all your data including your portfolio, CVs, jobs, and profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (!user) return;
              await supabase
                .from("user_saved_jobs")
                .delete()
                .eq("user_id", user.id);
              await supabase
                .from("portfolio_deployments")
                .delete()
                .eq("user_id", user.id);
              await supabase.from("user_cvs").delete().eq("user_id", user.id);
              await supabase
                .from("ai_chat_sessions")
                .delete()
                .eq("user_id", user.id);
              await supabase
                .from("job_digests_sent")
                .delete()
                .eq("user_id", user.id);
              await supabase.from("profiles").delete().eq("id", user.id);
              await supabase.auth.signOut();
            } catch (err: unknown) {
              showToast((err as Error).message || "Delete failed", "error");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleNotifications = async () => {
    try {
      const { status } = await requestNotificationPermissions();
      if (status === "unavailable-in-expo-go") {
        showToast("Phone alerts are not available in this test app.", "error");
        return;
      }

      showToast(
        status === "granted"
          ? "Notifications enabled"
          : "Notifications blocked , enable in device Settings",
        status === "granted" ? "success" : "error",
      );
    } catch {
      showToast("Could not request notification permissions", "error");
    }
  };

  const handleSecurityPrivacy = () => {
    Alert.alert(
      "Security & Privacy",
      "- Your data is encrypted at rest with Supabase\n- JWT tokens are stored in device Secure Store\n- We never sell your personal data\n- You can delete all your data at any time\n\nFor full details, see our Privacy Policy.",
      [
        {
          text: "View Privacy Policy",
          onPress: () => Linking.openURL("https://launchpad-legal.vercel.app/"),
        },
        { text: "Close" },
      ],
    );
  };

  const MenuItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    color = COLORS.slate,
    showChevron = true,
    danger = false,
  }: any) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: danger
              ? "rgba(244,63,94,0.1)"
              : "rgba(21,154,99,0.12)",
          },
        ]}
      >
        <Icon size={18} color={danger ? COLORS.rose : color} weight="duotone" />
      </View>
      <Text
        variant="label"
        color={danger ? COLORS.rose : COLORS.snow}
        style={{ flex: 1, marginLeft: 12 }}
      >
        {label}
      </Text>
      {value && (
        <Text variant="caption" style={{ marginRight: 6 }}>
          {value}
        </Text>
      )}
      {showChevron && <CaretRight size={16} color={COLORS.fog} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {/* Section 5A , show photo if available, fallback to gradient initial */}
            {profile?.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
                style={[
                  styles.avatar,
                  { borderWidth: 2, borderColor: COLORS.indigo },
                ]}
              />
            ) : (
              <LinearGradient
                colors={[COLORS.indigo, COLORS.cyan]}
                style={styles.avatar}
              >
                <Text
                  variant="display"
                  color={COLORS.white}
                  style={{ fontSize: 32, fontFamily: "ClashDisplay" }}
                >
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </Text>
              </LinearGradient>
            )}

            <View style={{ marginTop: 14, alignItems: "center" }}>
              <Text variant="h2" align="center">
                {profile?.full_name || "Your Name"}
              </Text>
              <Text variant="body" align="center" style={{ marginTop: 4 }}>
                {profile?.job_title || "Add your job title"}
              </Text>
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <StatusBadge label={subInfo.label} variant={subInfo.variant} />
                <Text variant="caption">{subInfo.desc}</Text>
              </View>
            </View>
          </View>

          {/* Upgrade Card */}
          {profile?.subscription_status !== "active" && (
            <TouchableOpacity activeOpacity={0.9} style={{ marginBottom: 16 }}>
              <LinearGradient
                colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.08)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeCard}
              >
                <Crown size={24} color={COLORS.gold} weight="fill" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="label" color={COLORS.snow}>
                    Upgrade to Pro
                  </Text>
                  <Text variant="caption">
                    $9.99/month or $79.99/year , 33% off
                  </Text>
                </View>
                <ArrowSquareOut size={18} color={COLORS.gold} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Profile Info */}
          <GlassCard style={{ marginBottom: 16 }} padding={0}>
            <View style={styles.sectionTitle}>
              <Text
                variant="caption"
                color={COLORS.fog}
                weight="semibold"
                style={{ letterSpacing: 1, textTransform: "uppercase" }}
              >
                Profile
              </Text>
            </View>
            <MenuItem
              icon={User}
              label="Edit Profile"
              value={`${(profile as any)?.profile_completeness ?? 0}% complete`}
              onPress={() => router.push("/(tabs)/profile/edit" as any)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={Envelope}
              label="Email"
              value={profile?.email || ""}
              onPress={() => {}}
              showChevron={false}
            />
            <View style={styles.divider} />
            {/* Section 6A , Portfolio opens live URL */}
            <MenuItem
              icon={Globe}
              label="Portfolio"
              value={profile?.portfolio_url ? "Live" : "Not generated"}
              onPress={() => {
                if (profile?.portfolio_url) {
                  Linking.openURL(profile.portfolio_url);
                } else {
                  router.push("/(tabs)/portfolio" as any);
                }
              }}
            />
            <View style={styles.divider} />
            {/* Section 6A , GitHub opens profile or navigates to edit */}
            <MenuItem
              icon={GithubLogo}
              label="GitHub"
              value={
                profile?.github_username
                  ? `@${profile.github_username}`
                  : "Not connected"
              }
              onPress={() => {
                if (profile?.github_username) {
                  Linking.openURL(
                    `https://github.com/${profile.github_username}`,
                  );
                } else {
                  router.push("/(tabs)/profile/edit" as any);
                }
              }}
            />
            <View style={styles.divider} />
            {/* LinkedIn opens URL or navigates to edit */}
            <MenuItem
              icon={LinkedinLogo}
              label="LinkedIn"
              value={profile?.linkedin_url ? "Connected" : "Not added"}
              onPress={() => {
                if (profile?.linkedin_url) {
                  Linking.openURL(profile.linkedin_url);
                } else {
                  router.push("/(tabs)/profile/edit" as any);
                }
              }}
            />
          </GlassCard>

          {/* Settings */}
          <GlassCard style={{ marginBottom: 16 }} padding={0}>
            <View style={styles.sectionTitle}>
              <Text
                variant="caption"
                color={COLORS.fog}
                weight="semibold"
                style={{ letterSpacing: 1, textTransform: "uppercase" }}
              >
                Settings
              </Text>
            </View>
            <View style={styles.themeSetting}>
              <Text variant="label" color={COLORS.snow}>
                Theme
              </Text>
              <View style={styles.themeControl}>
                {themeOptions.map((option) => {
                  const selected = themePreference === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      activeOpacity={0.8}
                      onPress={() => setThemePreference(option.key)}
                      style={[
                        styles.themeOption,
                        selected && styles.themeOptionActive,
                      ]}
                    >
                      <Text
                        variant="caption"
                        weight="semibold"
                        color={selected ? COLORS.white : COLORS.slate}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text variant="caption" color={COLORS.fog} style={{ marginTop: 8 }}>
                {themePreference === "system"
                  ? `Using ${theme === "dark" ? "Dark" : "Light"}`
                  : `${themePreference === "dark" ? "Dark" : "Light"} selected`}
              </Text>
            </View>
            <View style={styles.divider} />
            {/* Section 6B , Security & Privacy */}
            <MenuItem
              icon={Shield}
              label="Security & Privacy"
              onPress={() => router.push("/(tabs)/profile/security" as any)}
            />
            <View style={styles.divider} />
            {/* Section 6B , Notifications */}
            <MenuItem
              icon={Bell}
              label="Notifications"
              onPress={handleNotifications}
            />
            <View style={styles.divider} />
            {/* Section 6B , Terms & Privacy via browser */}
            <MenuItem
              icon={Info}
              label="Terms of Service"
              onPress={() =>
                Linking.openURL("https://launchpad-legal.vercel.app/")
              }
            />
            <View style={styles.divider} />
            <MenuItem
              icon={Lock}
              label="Privacy Policy"
              onPress={() =>
                Linking.openURL("https://launchpad-legal.vercel.app/")
              }
            />
          </GlassCard>

          {/* Account */}
          <GlassCard style={{ marginBottom: 16 }} padding={0}>
            <View style={styles.sectionTitle}>
              <Text
                variant="caption"
                color={COLORS.fog}
                weight="semibold"
                style={{ letterSpacing: 1, textTransform: "uppercase" }}
              >
                Account
              </Text>
            </View>
            <MenuItem icon={SignOut} label="Sign Out" onPress={handleSignOut} />
            <View style={styles.divider} />
            <MenuItem
              icon={Trash}
              label="Delete Account"
              onPress={handleDeleteAccount}
              danger
              showChevron={false}
            />
          </GlassCard>

          <Text variant="caption" align="center" style={{ marginTop: 8 }}>
            Launchpad v1.0 by Voolt Group Limited
          </Text>
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16 },
  profileHeader: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
  },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  themeSetting: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  themeControl: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeOptionActive: {
    backgroundColor: COLORS.indigo,
  },
  divider: { height: 1, backgroundColor: COLORS.rim, marginHorizontal: 16 },
});
