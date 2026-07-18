import React from "react";
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "phosphor-react-native";
import { Text } from "./Text";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
  onBack,
}) => {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack || (() => router.back())}
        style={styles.backBtn}
      >
        <ArrowLeft size={20} color={COLORS.slate} />
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < currentStep ? COLORS.indigo : COLORS.rim,
                opacity:
                  i === currentStep - 1 ? 1 : i < currentStep ? 0.7 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      <Text variant="caption" color={COLORS.fog}>
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
};

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});
