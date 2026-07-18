import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Toast } from "../../components/ui/Toast";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { ArrowLeft, EnvelopeSimple } from "phosphor-react-native";
import { useAuthStore } from "../../stores/authStore";

const OTP_LENGTH = 6;

export default function OTPVerifyScreen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { email, mode } = useLocalSearchParams<{
    email: string;
    mode: string;
  }>();
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);
  const { showToast } = useUIStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: OTP_LENGTH }, () => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    startCountdown();
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];

    if (value.length > 1) {
      const pasted = value.slice(0, OTP_LENGTH).split("");
      pasted.forEach((char, i) => {
        if (i < OTP_LENGTH) newOtp[i] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 1.1,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && value) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== OTP_LENGTH)
      return showToast("Enter the 6-digit code", "error");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email!,
        token: otpCode,
        type: mode === "signup" ? "signup" : "email",
      });

      if (error) throw error;

      showToast("Email verified successfully!", "success");

      // Manually trigger navigation since onAuthStateChange may be slow
      if (data.session) {
        const { setSession, fetchProfile } = useAuthStore.getState();
        setSession(data.session);
        if (data.session.user) {
          await fetchProfile(data.session.user.id);
        }
      }

      // Navigate after short delay to let store update
      setTimeout(() => {
        router.replace("/(onboarding)/step1");
      }, 300);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Invalid code. Please try again.", "error");
      setOtp(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email!,
      });
      if (error) throw error;
      showToast("New code sent to your email", "success");
      startCountdown();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Failed to resend code", "error");
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
          >
            <ArrowLeft size={22} color={COLORS.slate} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.12)"]}
              style={styles.iconGradient}
            >
              <EnvelopeSimple
                size={40}
                color={COLORS.indigo}
                weight="duotone"
              />
            </LinearGradient>
          </View>

          <Text
            variant="h1"
            align="center"
            style={{ marginTop: 24, marginBottom: 8 }}
          >
            Check Your Email
          </Text>
          <Text variant="body" align="center" style={{ paddingHorizontal: 32 }}>
            We sent a 6-digit verification code to{"\n"}
            <Text variant="body" color={COLORS.snow} weight="semibold">
              {email}
            </Text>
          </Text>

          {/* OTP Inputs */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.otpBox,
                  digit && styles.otpBoxFilled,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                <TextInput
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  maxLength={6}
                  keyboardType="number-pad"
                  style={styles.otpInput}
                  selectionColor={COLORS.indigo}
                />
              </Animated.View>
            ))}
          </View>

          <Button
            title={loading ? "Verifying..." : "Verify Email"}
            onPress={() => handleVerify()}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
          />

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text variant="body" color={COLORS.indigo} weight="semibold">
                  Resend Code
                </Text>
              </TouchableOpacity>
            ) : (
              <Text variant="body">
                Resend code in{" "}
                <Text variant="body" color={COLORS.snow} weight="semibold">
                  {countdown}s
                </Text>
              </Text>
            )}
          </View>
        </Animated.View>
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  iconContainer: { alignSelf: "center" },
  iconGradient: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 40,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxFilled: {
    borderColor: COLORS.indigo,
    backgroundColor: COLORS.elevated,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpInput: {
    color: COLORS.snow,
    fontSize: 22,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    width: "100%",
    height: "100%",
  },
  resendRow: { alignItems: "center", marginTop: 24 },
});
