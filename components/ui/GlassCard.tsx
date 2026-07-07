import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, RADIUS } from "../../constants/theme";

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
  intensity = 20,
  variant = "default",
  padding = 20,
}) => {
  const bgColors = {
    default: "rgba(15, 23, 41, 0.8)",
    elevated: "rgba(22, 32, 56, 0.9)",
    bordered: "rgba(15, 23, 41, 0.7)",
  };

  const borderColors = {
    default: "rgba(30, 45, 74, 0.6)",
    elevated: "rgba(79, 70, 229, 0.2)",
    bordered: "rgba(79, 70, 229, 0.3)",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
