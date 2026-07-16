import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../constants/theme";

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

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...SHADOWS.card,
  },
});
