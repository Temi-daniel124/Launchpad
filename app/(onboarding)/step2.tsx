import React, { useState, useRef } from "react";
import { View, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import {
  Target,
  Globe,
  ArrowsClockwise,
  TrendUp,
  Buildings,
} from "phosphor-react-native";

const createGoals = (COLORS: ThemeColors) => [
  {
    key: "land_remote",
    label: "Land a remote job internationally",
    icon: Globe,
    color: COLORS.indigo,
  },
  {
    key: "build_portfolio",
    label: "Build a professional portfolio",
    icon: Target,
    color: COLORS.cyan,
  },
  {
    key: "career_change",
    label: "Transition to a new career field",
    icon: ArrowsClockwise,
    color: COLORS.gold,
  },
  {
    key: "get_promoted",
    label: "Get promoted or advance in my role",
    icon: TrendUp,
    color: COLORS.emerald,
  },
  {
    key: "find_clients",
    label: "Find freelance clients or contracts",
    icon: Buildings,
    color: "#EC4899",
  },
];

export default function Step2Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const goals = React.useMemo(() => createGoals(COLORS), [COLORS]);
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(goals.map(() => new Animated.Value(1))).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleGoal = (key: string, index: number) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();

    setSelectedGoals((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
    );
  };

  const handleNext = async () => {
    if (selectedGoals.length === 0)
      return showToast("Select at least one goal", "error");
    setLoading(true);
    await updateProfile({ goals: selectedGoals });
    setLoading(false);
    router.push("/(onboarding)/step3");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <OnboardingProgress currentStep={2} totalSteps={7} />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <View style={{ height: 16 }} />
          <Text variant="h1" style={{ marginBottom: 8 }}>
            What's your goal?
          </Text>
          <Text variant="bodyLarge" style={{ marginBottom: 32 }}>
            Select everything that applies. We'll tailor Launchpad to your
            ambitions.
          </Text>

          <View style={{ gap: 12 }}>
              {goals.map((goal, index) => {
              const Icon = goal.icon;
              const selected = selectedGoals.includes(goal.key);
              return (
                <Animated.View
                  key={goal.key}
                  style={{ transform: [{ scale: scaleAnims[index] }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.goalCard,
                      selected && {
                        borderColor: goal.color,
                        backgroundColor: `${goal.color}12`,
                      },
                    ]}
                    onPress={() => toggleGoal(goal.key, index)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: `${goal.color}20` },
                      ]}
                    >
                      <Icon size={22} color={goal.color} weight="duotone" />
                    </View>
                    <Text
                      variant="label"
                      color={selected ? COLORS.snow : COLORS.slate}
                      style={{ flex: 1 }}
                    >
                      {goal.label}
                    </Text>
                    <View
                      style={[
                        styles.checkbox,
                        selected && {
                          backgroundColor: goal.color,
                          borderColor: goal.color,
                        },
                      ]}
                    >
                      {selected && (
                        <Text variant="caption" color={COLORS.white}>
                          Done
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          <View style={{ flex: 1 }} />
          <Button
            title="Continue"
            onPress={handleNext}
            loading={loading}
            size="lg"
            style={{ marginBottom: 32 }}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
});
