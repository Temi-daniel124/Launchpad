import { Stack } from "expo-router";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";

export default function OnboardingLayout() {
  const { colors: COLORS } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.abyss },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="step1" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
      <Stack.Screen name="step4" />
      <Stack.Screen name="step5" />
      <Stack.Screen name="step6" />
      <Stack.Screen name="step7" />
      <Stack.Screen name="trial-activated" />
    </Stack>
  );
}
