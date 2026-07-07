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
import { router } from "expo-router";
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
  EnvelopeSimple,
  CheckCircle,
  LockKey,
} from "phosphor-react-native";

type Step = "enter_email" | "email_sent";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("enter_email");
  const { showToast } = useUIStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

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
  }, []);

  useEffect(() => {
    if (step === "email_sent") {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 10,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  const handleSendReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return showToast("Please enter your email address", "error");
    if (!trimmed.includes("@") || !trimmed.includes("."))
      return showToast("Please enter a valid email address", "error");

    setLoading(true);
    try {
      // ✅ FIX: redirectTo must match EXACTLY the scheme in app.json / app.config.js
      // The scheme is "com.vooltgroup.launchpad" → deep link = "com.vooltgroup.launchpad://reset-password"
      // This was previously "launchpad://reset-password" which is WRONG — the app never received the link
      // Also add this URL to Supabase Auth → URL Configuration → Redirect URLs
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: "com.vooltgroup.launchpad://reset-password",
      });

      if (error) {
        if (error.message.toLowerCase().includes("rate")) {
          showToast("Too many requests. Please wait a few minutes.", "error");
        } else {
          showToast(
            error.message || "Something went wrong. Try again.",
            "error",
          );
        }
        return;
      }
      setStep("email_sent");
    } catch (err: unknown) {
      showToast(
        (err as Error).message || "Failed to send reset email",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSuccessState = () => (
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
        <CheckCircle size={48} color={COLORS.emerald} weight="fill" />
      </LinearGradient>

      <Text
        variant="h2"
        align="center"
        style={{ marginTop: 24, marginBottom: 12 }}
      >
        Check Your Email
      </Text>
      <Text
        variant="body"
        color={COLORS.slate}
        align="center"
        style={{ lineHeight: 22, marginBottom: 8 }}
      >
        If an account exists for{" "}
        <Text variant="body" color={COLORS.snow} weight="semibold">
          {email.trim().toLowerCase()}
        </Text>
        , a password reset link has been sent.
      </Text>
      <Text
        variant="caption"
        color={COLORS.fog}
        align="center"
        style={{ lineHeight: 19, marginBottom: 24 }}
      >
        Check your inbox and spam folder. The link expires in 1 hour.
      </Text>

      {/* Important instruction */}
      <View style={styles.importantBox}>
        <Text variant="label" color={COLORS.gold} style={{ marginBottom: 6 }}>
          Important
        </Text>
        <Text variant="caption" color={COLORS.slate} style={{ lineHeight: 19 }}>
          Open the reset email on your phone and tap "Reset Password" inside the
          Launchpad app. Opening it in a web browser will show a blank page —
          this is expected. The link is designed to open the mobile app
          directly.
        </Text>
      </View>

      <View style={styles.stepsCard}>
        {[
          { num: "1", text: "Open the email from Launchpad on your phone" },
          { num: "2", text: 'Tap "Reset Password" to open the Launchpad app' },
          { num: "3", text: "Enter and confirm your new password" },
          { num: "4", text: "Sign in with your new credentials" },
        ].map((item) => (
          <View key={item.num} style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text
                style={{
                  color: COLORS.indigo,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {item.num}
              </Text>
            </View>
            <Text variant="caption" color={COLORS.slate} style={{ flex: 1 }}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      <Button
        title="Back to Sign In"
        onPress={() => router.replace("/(auth)/sign-in")}
        variant="secondary"
        size="lg"
        style={{ marginTop: 24 }}
      />
      <TouchableOpacity
        onPress={() => {
          successScale.setValue(0);
          successOpacity.setValue(0);
          setStep("enter_email");
        }}
        style={{ marginTop: 16, alignSelf: "center" }}
        activeOpacity={0.7}
      >
        <Text variant="caption" color={COLORS.fog}>
          Didn't receive it?{" "}
          <Text variant="caption" color={COLORS.indigo}>
            Try again
          </Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(79,70,229,0.2)", "rgba(79,70,229,0.05)"]}
        style={styles.formIconBg}
      >
        <LockKey size={32} color={COLORS.indigo} weight="duotone" />
      </LinearGradient>
      <Text variant="display" style={{ marginTop: 20, marginBottom: 10 }}>
        Reset Password
      </Text>
      <Text
        variant="bodyLarge"
        color={COLORS.slate}
        style={{ marginBottom: 36, lineHeight: 22 }}
      >
        Enter the email address linked to your account and we'll send you a
        secure reset link.
      </Text>
      <InputField
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={handleSendReset}
        leftIcon={<EnvelopeSimple size={18} color={COLORS.fog} />}
      />
      <Button
        title="Send Reset Link"
        onPress={handleSendReset}
        loading={loading}
        size="lg"
        style={{ marginTop: 24 }}
      />
      <Text
        variant="caption"
        color={COLORS.fog}
        align="center"
        style={{ marginTop: 12, lineHeight: 18 }}
      >
        For security, we never confirm whether an email is registered.
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backToSignIn}
        activeOpacity={0.7}
      >
        <Text variant="body" color={COLORS.slate}>
          Remembered your password?{" "}
        </Text>
        <Text variant="body" color={COLORS.indigo} weight="semibold">
          Sign In
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(79,70,229,0.07)", "transparent"]}
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
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color={COLORS.slate} />
              </TouchableOpacity>
            </View>
            <View style={styles.body}>
              {step === "enter_email" ? renderForm() : renderSuccessState()}
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
  formContainer: { flex: 1 },
  formIconBg: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.2)",
  },
  backToSignIn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  successContainer: { flex: 1, alignItems: "center", paddingTop: 16 },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  importantBox: {
    width: "100%",
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    backgroundColor: "rgba(245,158,11,0.07)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  stepsCard: {
    width: "100%",
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.rim,
    padding: 16,
    gap: 14,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(79,70,229,0.15)",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
