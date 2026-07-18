import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Toast } from "../../../components/ui/Toast";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../../contexts/ThemeContext";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeSlash,
  ShieldCheck,
  FingerprintSimple,
  Info,
  Globe,
  ArrowSquareOut,
} from "phosphor-react-native";

const BIOMETRIC_EMAIL_KEY = "biometric_email";
const BIOMETRIC_PASSWORD_KEY = "biometric_password";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

export default function SecurityScreen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Fingerprint");

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setBiometricAvailable(true);
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricType("Face ID");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType("Fingerprint");
        }
      }
      const stored = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(stored === "true");
    } catch {
      setBiometricAvailable(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8)
      return showToast("Password must be at least 8 characters", "error");
    if (newPassword !== confirmPassword)
      return showToast("Passwords don't match", "error");
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      // Update stored password if biometric is enabled
      const isBiometricOn = await SecureStore.getItemAsync(
        BIOMETRIC_ENABLED_KEY,
      );
      if (isBiometricOn === "true") {
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, newPassword);
      }
      showToast("Password updated successfully", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to update password", "error");
    } finally {
      setSavingPw(false);
    }
  };

  const handleBiometricToggle = async (enable: boolean) => {
    try {
      if (enable) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Confirm your ${biometricType} to enable biometric login`,
          fallbackLabel: "Use password",
          cancelLabel: "Cancel",
        });
        if (!result.success) {
          showToast("Biometric authentication was not confirmed", "error");
          return;
        }
        const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
        const savedPassword = await SecureStore.getItemAsync(
          BIOMETRIC_PASSWORD_KEY,
        );
        if (!savedEmail || !savedPassword) {
          Alert.alert(
            "Sign In Required",
            "To enable biometric login, please sign out and sign back in with your email and password first. This securely saves your credentials.",
            [{ text: "OK" }],
          );
          return;
        }
        // Verify credentials are still valid
        const { error } = await supabase.auth.signInWithPassword({
          email: savedEmail,
          password: savedPassword,
        });
        if (error) {
          showToast(
            "Could not verify credentials. Please sign out and sign back in, then try again.",
            "error",
          );
          await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
          await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
          return;
        }
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
        setBiometricEnabled(true);
        showToast(
          `${biometricType} login enabled! You can now sign in with your fingerprint.`,
          "success",
        );
      } else {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "false");
        setBiometricEnabled(false);
        showToast(`${biometricType} login disabled`, "success");
      }
    } catch (err: unknown) {
      showToast(
        (err as Error).message || "Could not toggle biometric login",
        "error",
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={COLORS.snow} />
          </TouchableOpacity>
          <Text variant="h2" style={{ flex: 1, marginLeft: 12 }}>
            Security & Privacy
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Change Password */}
          <GlassCard padding={0} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={18} color={COLORS.indigo} weight="duotone" />
              <Text
                variant="label"
                color={COLORS.snow}
                style={{ marginLeft: 10 }}
              >
                Change Password
              </Text>
            </View>
            <View style={styles.sectionBody}>
              <Text
                variant="caption"
                color={COLORS.fog}
                style={{ marginBottom: 14 }}
              >
                Must be at least 8 characters. If biometric login is on, your
                new password is saved automatically.
              </Text>
              <View style={styles.pwField}>
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor={COLORS.fog}
                  secureTextEntry={!showPw}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPw((v) => !v)}
                  style={styles.eyeBtn}
                >
                  {showPw ? (
                    <EyeSlash size={18} color={COLORS.fog} />
                  ) : (
                    <Eye size={18} color={COLORS.fog} />
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.fog}
                secureTextEntry={!showPw}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={savingPw || !newPassword || !confirmPassword}
                style={[
                  styles.saveBtn,
                  (savingPw || !newPassword || !confirmPassword) && {
                    opacity: 0.5,
                  },
                ]}
                activeOpacity={0.8}
              >
                {savingPw ? (
                  <ActivityIndicator color="#fff" size={16} />
                ) : (
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
                  >
                    Update Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Biometric */}
          {biometricAvailable && (
            <GlassCard padding={0} style={styles.section}>
              <View style={styles.sectionHeader}>
                <FingerprintSimple
                  size={18}
                  color={COLORS.emerald}
                  weight="duotone"
                />
                <Text
                  variant="label"
                  color={COLORS.snow}
                  style={{ marginLeft: 10, flex: 1 }}
                >
                  {biometricType} Login
                </Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: COLORS.rim, true: COLORS.emerald }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.sectionBody}>
                <Text variant="caption" color={COLORS.fog}>
                  When enabled, sign in using your {biometricType} from the
                  login screen. Your biometric data never leaves your device.
                </Text>
                {biometricEnabled && (
                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ShieldCheck
                      size={14}
                      color={COLORS.emerald}
                      weight="fill"
                    />
                    <Text variant="caption" color={COLORS.emerald}>
                      Active , fingerprint sign-in is enabled
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          )}

          {/* Data & Privacy */}
          <GlassCard padding={0} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={18} color={COLORS.gold} weight="duotone" />
              <Text
                variant="label"
                color={COLORS.snow}
                style={{ marginLeft: 10 }}
              >
                Data & Privacy
              </Text>
            </View>
            <View style={styles.sectionBody}>
              {[
                {
                  label: "Data encrypted at rest",
                  detail: "Supabase PostgreSQL with AES-256",
                },
                {
                  label: "Auth tokens stored securely",
                  detail: "Device Secure Store , never in plain storage",
                },
                {
                  label: "We never sell your data",
                  detail: "Your profile, CVs, and applications are private",
                },
                {
                  label: "AI processing",
                  detail: "CV and chat data sent to OpenAI for generation only",
                },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Info size={14} color={COLORS.indigo} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      variant="label"
                      color={COLORS.snow}
                      style={{ fontSize: 13 }}
                    >
                      {item.label}
                    </Text>
                    <Text variant="caption" color={COLORS.fog}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() =>
                  Linking.openURL("https://vooltgrouplimited.com/privacy")
                }
                activeOpacity={0.7}
              >
                <Globe size={16} color={COLORS.indigo} />
                <Text
                  variant="label"
                  color={COLORS.indigo}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  View Privacy Policy
                </Text>
                <ArrowSquareOut size={14} color={COLORS.indigo} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() =>
                  Linking.openURL("https://vooltgrouplimited.com/terms")
                }
                activeOpacity={0.7}
              >
                <Globe size={16} color={COLORS.indigo} />
                <Text
                  variant="label"
                  color={COLORS.indigo}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  Terms of Service
                </Text>
                <ArrowSquareOut size={14} color={COLORS.indigo} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20 },
  section: { marginBottom: 16, overflow: "hidden" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
  },
  sectionBody: { padding: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.snow,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  pwField: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, top: 12 },
  saveBtn: {
    marginTop: 14,
    backgroundColor: COLORS.indigo,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  divider: { height: 1, backgroundColor: COLORS.rim, marginVertical: 14 },
  linkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
});
