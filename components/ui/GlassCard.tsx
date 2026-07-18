import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  variant?: "default" | "elevated" | "bordered";
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity: _intensity = 20,
  variant = "default",
  padding = 20,
}) => {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);

  const bgColors = {
    default: COLORS.navy,
    elevated: COLORS.elevated,
    bordered: COLORS.navy,
  };

  const borderColors = {
    default: COLORS.rim,
    elevated: COLORS.rim,
    bordered: COLORS.indigo,
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColors[variant],
          borderColor: borderColors[variant],
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...SHADOWS.card,
  },
});
