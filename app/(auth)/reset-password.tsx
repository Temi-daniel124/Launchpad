import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { Toast } from "../../components/ui/Toast";
import { useUIStore } from "../../stores/uiStore";
import { COLORS, RADIUS } from "../../constants/theme";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  Lock,
  CheckCircle,
  ShieldCheck,
} from "phosphor-react-native";

// -----------------------------------------------------------------------------
// Password strength helpers
// -----------------------------------------------------------------------------
interface PasswordStrength {
  score: number;
  label: string;
  color: string; // plain string , not restricted to COLORS keys
  checks: {
    label: string;
    passed: boolean;
  }[];
}

function evaluatePassword(pw: string): PasswordStrength {
  const checks = [
    { label: "At least 8 characters", passed: pw.length >= 8 },
    { label: "Uppercase letter (A to Z)", passed: /[A-Z]/.test(pw) },
    { label: "Lowercase letter (a to z)", passed: /[a-z]/.test(pw) },
    { label: "Number (0 to 9)", passed: /\d/.test(pw) },
    { label: "Special character (!@#...)", passed: /[^A-Za-z0-9]/.test(pw) },
  ];

  const score = checks.filter((c) => c.passed).length;

  // Use string literals throughout , avoids TypeScript literal-union mismatch
  // with the COLORS const object whose values are `as const` string literals
  let label = "Too weak";
  let color = "#F43F5E"; // rose
  if (score >= 5) {
    label = "Very strong";
    color = "#10B981";
  } // emerald
  else if (score >= 4) {
    label = "Strong";
    color = "#22C55E";
  } else if (score >= 3) {
    label = "Fair";
    color = "#F59E0B";
  } // gold
  else if (score >= 2) {
    label = "Weak";
    color = "#F97316";
  }

  return { score, label, color, checks };
}

// -----------------------------------------------------------------------------
// SCREEN
// -----------------------------------------------------------------------------
type Step = "set_password" | "success";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("set_password");
  const [sessionReady, setSessionReady] = useState(false);

  const { showToast } = useUIStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const strength = evaluatePassword(password);

  // -- Wait for Supabase to establish the session from the deep-link token ----
  // When the user taps the reset link in their email:
  //   1. The OS opens the app via the deep link scheme (launchpad://reset-password?...)
  //   2. Supabase parses the #access_token fragment and calls onAuthStateChange
  //      with event = "PASSWORD_RECOVERY"
  //   3. At that point we know the session is valid and the user can set a new password
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }),
    ]).start();

    // Listen for the PASSWORD_RECOVERY auth event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if we already have a valid session
    // (user may have already been authenticated when the link was opened)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Animate success state
  useEffect(() => {
    if (step === "success") {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  // -- Handler ----------------------------------------------------------------
  const handleUpdatePassword = async () => {
    if (!password) {
      showToast("Please enter a new password", "error");
      return;
    }
    if (strength.score < 3) {
      showToast("Please choose a stronger password", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (!sessionReady) {
      showToast(
        "Session not ready. Make sure you opened this screen from the reset email link.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Sign out all other sessions for security
      await supabase.auth.signOut({ scope: "others" });

      setStep("success");
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message?.toLowerCase().includes("same password")) {
        showToast(
          "New password must be different from your current password.",
          "error",
        );
      } else {
        showToast(e.message || "Failed to update password", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // -- Strength bar segments -------------------------------------------------
  const renderStrengthBar = () => {
    if (!password) return null;
    const segments = 4;
    const filledCount = Math.ceil((strength.score / 5) * segments);
    return (
      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <View style={styles.strengthBarRow}>
          {Array.from({ length: segments }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.strengthSegment,
                {
                  backgroundColor:
                    i < filledCount ? strength.color : COLORS.rim,
                },
              ]}
            />
          ))}
          <Text
            style={{
              fontSize: 12,
              color: strength.color,
              fontWeight: "600",
              marginLeft: 8,
            }}
          >
            {strength.label}
          </Text>
        </View>

        {/* Requirements checklist , shown while typing */}
        <View style={{ marginTop: 10, gap: 6 }}>
          {strength.checks.map((check) => (
            <View key={check.label} style={styles.checkRow}>
              <CheckCircle
                size={13}
                color={check.passed ? COLORS.emerald : COLORS.fog}
                weight={check.passed ? "fill" : "regular"}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: check.passed ? COLORS.slate : COLORS.fog,
                  marginLeft: 7,
                }}
              >
                {check.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // -- Success view -----------------------------------------------------------
  const renderSuccess = () => (
    <Animated.View
      style={[
        styles.successContainer,
        { opacity: successOpacity, transform: [{ scale: successScale }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(16,185,129,0.2)", "rgba(16,185,129,0.05)"]}
        style={styles.successIconBg}
      >
        <ShieldCheck size={48} color={COLORS.emerald} weight="fill" />
      </LinearGradient>

      <Text
        variant="h2"
        align="center"
        style={{ marginTop: 24, marginBottom: 12 }}
      >
        Password Updated!
      </Text>
      <Text
        variant="body"
        color={COLORS.slate}
        align="center"
        style={{ lineHeight: 22, marginBottom: 36 }}
      >
        Your password has been changed successfully. All other devices have been
        signed out for your security.
      </Text>

      <Button
        title="Sign In Now"
        onPress={() => router.replace("/(auth)/sign-in")}
        size="lg"
      />
    </Animated.View>
  );

  // -- Set-password form -----------------------------------------------------
  const renderForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.12)"]}
        style={styles.formIconBg}
      >
        <Lock size={32} color={COLORS.indigo} weight="duotone" />
      </LinearGradient>

      <Text variant="display" style={{ marginTop: 20, marginBottom: 10 }}>
        New Password
      </Text>
      <Text
        variant="bodyLarge"
        color={COLORS.slate}
        style={{ marginBottom: 32, lineHeight: 22 }}
      >
        Choose a strong password for your Launchpad account.
      </Text>

      {/* Session not ready warning */}
      {!sessionReady && (
        <View style={styles.warningBanner}>
          <Text
            variant="caption"
            color={COLORS.gold}
            style={{ lineHeight: 18 }}
          >
            Warning: Waiting for reset link verification. If this persists, tap the
            link in your email again to reopen this screen.
          </Text>
        </View>
      )}

      <View style={{ gap: 16 }}>
        <View>
          <InputField
            label="New Password"
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
          {renderStrengthBar()}
        </View>

        <InputField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secured={!showConfirm}
          leftIcon={<Lock size={18} color={COLORS.fog} />}
          rightIcon={
            showConfirm ? (
              <EyeSlash size={18} color={COLORS.fog} />
            ) : (
              <Eye size={18} color={COLORS.fog} />
            )
          }
          onRightIconPress={() => setShowConfirm(!showConfirm)}
        />

        {/* Match indicator */}
        {confirmPassword.length > 0 && (
          <View style={styles.checkRow}>
            <CheckCircle
              size={13}
              color={
                password === confirmPassword ? COLORS.emerald : COLORS.rose
              }
              weight="fill"
            />
            <Text
              style={{
                fontSize: 12,
                color:
                  password === confirmPassword ? COLORS.emerald : COLORS.rose,
                marginLeft: 7,
              }}
            >
              {password === confirmPassword
                ? "Passwords match"
                : "Passwords do not match"}
            </Text>
          </View>
        )}
      </View>

      <Button
        title="Update Password"
        onPress={handleUpdatePassword}
        loading={loading}
        disabled={!sessionReady}
        size="lg"
        style={{ marginTop: 28 }}
      />

      <Text
        variant="caption"
        color={COLORS.fog}
        align="center"
        style={{ marginTop: 12, lineHeight: 18 }}
      >
        After updating, all other devices will be signed out automatically.
      </Text>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/sign-in")}
        style={{ marginTop: 24, alignSelf: "center" }}
        activeOpacity={0.7}
      >
        <Text variant="caption" color={COLORS.fog}>
          Back to{" "}
          <Text variant="caption" color={COLORS.indigo}>
            Sign In
          </Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

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
            {step === "set_password" && (
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => router.replace("/(auth)/sign-in")}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={22} color={COLORS.slate} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.body}>
              {step === "set_password" ? renderForm() : renderSuccess()}
            </View>
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
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 48 },
  // -- Form ------------------------------------------------------------------
  formContainer: { flex: 1 },
  formIconBg: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
  },
  warningBanner: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 20,
  },
  // -- Strength bar ----------------------------------------------------------
  strengthBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // -- Success ---------------------------------------------------------------
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 8,
  },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
});
