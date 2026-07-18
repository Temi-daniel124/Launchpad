import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../stores/authStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { Rocket, CheckCircle } from "phosphor-react-native";

const FEATURES = [
  "Portfolio generation with live Vercel deployment",
  "Daily job digest from 4 major platforms",
  "AI CV builder , 4 country formats",
  "LinkedIn DM drafts for every job",
  "24/7 AI career assistant",
];

export default function TrialActivatedScreen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { profile } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const itemAnims = useRef(FEATURES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 6,
        bounciness: 12,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(
        80,
        itemAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 14,
          }),
        ),
      ),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.08)", "transparent"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {/* Rocket Icon */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], marginBottom: 24 }}
          >
            <LinearGradient
              colors={[COLORS.indigo, COLORS.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rocketGradient}
            >
              <Rocket size={52} color="#fff" weight="fill" />
            </LinearGradient>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
            <Text
              variant="caption"
              color={COLORS.emerald}
              weight="semibold"
              style={{
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Trial Activated
            </Text>
            <Text variant="display" align="center" style={{ marginBottom: 8 }}>
              Your Career Is{"\n"}Launching 
            </Text>
            <Text
              variant="bodyLarge"
              align="center"
              style={{ marginBottom: 8 }}
            >
              Welcome, {profile?.full_name?.split(" ")[0] || "there"}!
            </Text>
            <Text variant="body" align="center" style={{ marginBottom: 32 }}>
              You have{" "}
              <Text variant="body" color={COLORS.gold} weight="semibold">
                7 days of full access
              </Text>{" "}
              , completely free. No credit card needed.
            </Text>
          </Animated.View>

          {/* Features list */}
          <View style={{ width: "100%", gap: 12, marginBottom: 40 }}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureRow,
                  {
                    opacity: itemAnims[index],
                    transform: [
                      {
                        translateX: itemAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <CheckCircle size={18} color={COLORS.emerald} weight="fill" />
                <Text
                  variant="body"
                  color={COLORS.snow}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  {feature}
                </Text>
              </Animated.View>
            ))}
          </View>

          <Button
            title="Go to Dashboard"
            onPress={() => router.replace("/(tabs)/home")}
            size="lg"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  rocketGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
