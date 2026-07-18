import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { Toast } from "../../components/ui/Toast";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  EnvelopeSimple,
  Lock,
  User,
} from "phosphor-react-native";

const BIOMETRIC_EMAIL_KEY = "biometric_email";
const BIOMETRIC_PASSWORD_KEY = "biometric_password";

export default function SignUpScreen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useUIStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
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
  }, []);

  const handleEmailSignUp = async () => {
    if (!fullName.trim())
      return showToast("Please enter your full name", "error");
    if (!email.trim() || !email.includes("@"))
      return showToast("Please enter a valid email", "error");
    if (password.length < 8)
      return showToast("Password must be at least 8 characters", "error");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) throw error;

      // Pre-save credentials so biometric is ready after user verifies email
      try {
        await SecureStore.setItemAsync(
          BIOMETRIC_EMAIL_KEY,
          email.trim().toLowerCase(),
        );
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
      } catch {
        // Non-fatal
      }

      showToast("Verification code sent to your email!", "success");
      router.push({
        pathname: "/(auth)/otp-verify",
        params: { email: email.trim().toLowerCase(), mode: "signup" },
      });
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Sign up failed. Please try again.", "error");
    } finally {
      setLoading(false);
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
                Create Account
              </Text>
              <Text variant="bodyLarge" style={{ marginBottom: 32 }}>
                Start your 7-day free trial. No credit card required.
              </Text>

              <View style={{ gap: 16 }}>
                <InputField
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  leftIcon={<User size={18} color={COLORS.fog} />}
                />
                <InputField
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<EnvelopeSimple size={18} color={COLORS.fog} />}
                />
                <InputField
                  label="Password (min. 8 characters)"
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

              <View style={{ height: 28 }} />

              <Button
                title="Create Account"
                onPress={handleEmailSignUp}
                loading={loading}
                size="lg"
              />

              <Text
                variant="caption"
                align="center"
                style={{ marginTop: 20, paddingHorizontal: 16 }}
              >
                By creating an account, you agree to our{" "}
                <Text
                  variant="caption"
                  color={COLORS.indigo}
                  onPress={() => router.push("/(auth)/terms" as any)}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  variant="caption"
                  color={COLORS.indigo}
                  onPress={() => router.push("/(auth)/privacy" as any)}
                >
                  Privacy Policy
                </Text>
              </Text>

              <View style={styles.signInRow}>
                <Text variant="body">Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.replace("/(auth)/sign-in")}
                >
                  <Text variant="body" color={COLORS.indigo} weight="semibold">
                    Sign In
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

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
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
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
});
