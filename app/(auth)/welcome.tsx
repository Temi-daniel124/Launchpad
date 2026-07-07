import React, { useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { COLORS, RADIUS } from "../../constants/theme";
import { Rocket, Briefcase, FileText, Robot } from "phosphor-react-native";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    icon: Rocket,
    iconColor: COLORS.indigo,
    title: "Launch Your\nPortfolio",
    subtitle:
      "Get a live, professional portfolio website deployed in minutes. Powered by real GitHub projects and AI.",
  },
  {
    icon: Briefcase,
    iconColor: COLORS.cyan,
    title: "Daily Job\nMatches",
    subtitle:
      "Top 10 matched opportunities delivered to your inbox every morning from 4 major job platforms worldwide.",
  },
  {
    icon: FileText,
    iconColor: COLORS.gold,
    title: "AI-Powered\nCV Builder",
    subtitle:
      "Country-specific CVs built to UK, USA, European, and International hiring standards. Download as PDF.",
  },
  {
    icon: Robot,
    iconColor: COLORS.emerald,
    title: "Your Career\nAssistant",
    subtitle:
      "24/7 AI career coach that knows your profile, your goals, and your target market. Always in your corner.",
  },
];

export default function WelcomeScreen() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 8,
      }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(79,70,229,0.15)", "transparent", "rgba(6,182,212,0.08)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[COLORS.indigo, COLORS.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Rocket size={22} color="#fff" weight="fill" />
            </LinearGradient>
            <Text variant="h2" style={{ marginLeft: 10 }}>
              Launchpad
            </Text>
          </View>

          {/* Slides */}
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {SLIDES.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <View key={index} style={[styles.slide, { width }]}>
                  <View
                    style={[
                      styles.iconContainer,
                      { shadowColor: slide.iconColor },
                    ]}
                  >
                    <LinearGradient
                      colors={[`${slide.iconColor}25`, `${slide.iconColor}10`]}
                      style={styles.iconGradient}
                    >
                      <Icon
                        size={52}
                        color={slide.iconColor}
                        weight="duotone"
                      />
                    </LinearGradient>
                  </View>
                  <Text
                    variant="display"
                    align="center"
                    style={{ marginTop: 32, marginBottom: 16, lineHeight: 46 }}
                  >
                    {slide.title}
                  </Text>
                  <Text
                    variant="bodyLarge"
                    align="center"
                    style={{ paddingHorizontal: 32, lineHeight: 26 }}
                  >
                    {slide.subtitle}
                  </Text>
                </View>
              );
            })}
          </Animated.ScrollView>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [6, 24, 6],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { width: dotWidth, opacity }]}
                />
              );
            })}
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonsContainer}>
            <Button
              title="Create Free Account"
              onPress={() => router.push("/(auth)/sign-up")}
              variant="primary"
              size="lg"
            />
            <View style={{ height: 12 }} />
            <Button
              title="I Already Have an Account"
              onPress={() => router.push("/(auth)/sign-in")}
              variant="secondary"
              size="lg"
            />
            <Text variant="caption" align="center" style={{ marginTop: 16 }}>
              7-day free trial • No credit card required
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.indigo,
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
