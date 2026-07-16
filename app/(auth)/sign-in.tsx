import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { Toast } from "../../components/ui/Toast";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { COLORS, RADIUS } from "../../constants/theme";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  EnvelopeSimple,
  Lock,
  Fingerprint,
} from "phosphor-react-native";

// Keys for secure storage
const BIOMETRIC_EMAIL_KEY = "biometric_email";
const BIOMETRIC_PASSWORD_KEY = "biometric_password";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const { showToast } = useUIStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 10,
      }),
    ]).start();

    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);

      const shouldShow =
        hasHardware && isEnrolled && enabled === "true" && !!savedEmail;

      setBiometricAvailable(shouldShow);
      setBiometricEnabled(shouldShow);

      if (savedEmail) setEmail(savedEmail);
    } catch {
      setBiometricAvailable(false);
    }
  };

  const handleBiometricSignIn = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to Launchpad",
        fallbackLabel: "Use password instead",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      const storedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
      const storedPassword = await SecureStore.getItemAsync(
        BIOMETRIC_PASSWORD_KEY,
      );

      if (!storedEmail || !storedPassword) {
        showToast(
          "Biometric credentials not found. Please sign in with your password.",
          "error",
        );
        setBiometricEnabled(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: storedEmail,
        password: storedPassword,
      });

      if (error) {
        showToast(
          "Biometric sign in failed. Your password may have changed.",
          "error",
        );
        await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
        await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        setBiometricEnabled(false);
        return;
      }

      if (data.session) {
        const { setSession, fetchProfile } = useAuthStore.getState();
        setSession(data.session);
        if (data.session.user) await fetchProfile(data.session.user.id);
        const profile = useAuthStore.getState().profile;
        setTimeout(() => {
          if (!profile?.onboarding_completed) {
            router.replace("/(onboarding)/step1");
          } else {
            router.replace("/(tabs)/home");
          }
        }, 200);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Biometric sign in failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !email.includes("@"))
      return showToast("Enter a valid email", "error");
    if (!password) return showToast("Enter your password", "error");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      if (data.session) {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && isEnrolled) {
            const existingEnabled = await SecureStore.getItemAsync(
              BIOMETRIC_ENABLED_KEY,
            );
            if (existingEnabled === "true") {
              await SecureStore.setItemAsync(
                BIOMETRIC_EMAIL_KEY,
                email.trim().toLowerCase(),
              );
              await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
            } else if (!existingEnabled) {
              await SecureStore.setItemAsync(
                BIOMETRIC_EMAIL_KEY,
                email.trim().toLowerCase(),
              );
              await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
            }
          }
        } catch {
          // SecureStore failure is non-fatal
        }

        const { setSession, fetchProfile } = useAuthStore.getState();
        setSession(data.session);
        if (data.session.user) await fetchProfile(data.session.user.id);

        const profile = useAuthStore.getState().profile;
        setTimeout(() => {
          if (!profile?.onboarding_completed) {
            router.replace("/(onboarding)/step1");
          } else {
            router.replace("/(tabs)/home");
          }
        }, 300);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(
        error.message || "Sign in failed. Check your credentials.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // -- Navigate to Forgot Password --------------------------------------------
  // The screen lives at app/(auth)/forgot-password.tsx
  const handleForgotPassword = () => {
    router.push("/(auth)/forgot-password");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
              >
                <ArrowLeft size={22} color={COLORS.slate} />
              </TouchableOpacity>
            </View>

            <Animated.View
              style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text variant="display" style={{ marginBottom: 8 }}>
                Welcome Back
              </Text>
              <Text variant="bodyLarge" style={{ marginBottom: 36 }}>
                Sign in to continue your career journey.
              </Text>

              <View style={{ gap: 16, marginBottom: 8 }}>
                <InputField
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<EnvelopeSimple size={18} color={COLORS.fog} />}
                />
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secured={!showPassword}
                  leftIcon={<Lock size={18} color={COLORS.fog} />}
                  rightIcon={
                    showPassword ? (
                      <EyeSlash size={18} color={COLORS.fog} />
                    ) : (
                      <Eye size={18} color={COLORS.fog} />
                    )
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />
              </View>

              {/*  FIXED: now navigates to forgot-password screen */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={{ alignSelf: "flex-end", marginBottom: 28 }}
                activeOpacity={0.7}
              >
                <Text variant="caption" color={COLORS.indigo}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
                size="lg"
              />

              {/* Biometric , only shown when available and enabled */}
              {biometricEnabled && !loading && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricSignIn}
                  activeOpacity={0.8}
                >
                  <Fingerprint
                    size={24}
                    color={COLORS.indigo}
                    weight="duotone"
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text variant="label" color={COLORS.snow}>
                      Sign in with Fingerprint
                    </Text>
                    <Text variant="caption" color={COLORS.fog}>
                      Use your registered fingerprint
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.signUpRow}>
                <Text variant="body">Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.replace("/(auth)/sign-up")}
                >
                  <Text variant="body" color={COLORS.indigo} weight="semibold">
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.indigo}55`,
    backgroundColor: `${COLORS.indigo}0A`,
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
});
