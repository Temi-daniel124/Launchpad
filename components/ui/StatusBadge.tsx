import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";

interface StatusBadgeProps {
  label: string;
  variant?: "success" | "error" | "warning" | "info" | "gold" | "default";
  dot?: boolean;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "default",
  dot = false,
  pulse = false,
}) => {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);

  const configs = {
    success: {
      bg: "rgba(16,185,129,0.15)",
      color: COLORS.emerald,
      border: "rgba(16,185,129,0.3)",
    },
    error: {
      bg: "rgba(244,63,94,0.15)",
      color: COLORS.rose,
      border: "rgba(244,63,94,0.3)",
    },
    warning: {
      bg: "rgba(245,158,11,0.15)",
      color: COLORS.gold,
      border: "rgba(245,158,11,0.3)",
    },
    info: {
      bg: "rgba(21,154,99,0.12)",
      color: COLORS.indigoLight,
      border: "rgba(21,154,99,0.12)",
    },
    gold: {
      bg: "rgba(245,158,11,0.15)",
      color: COLORS.gold,
      border: "rgba(245,158,11,0.4)",
    },
    default: { bg: COLORS.elevated, color: COLORS.slate, border: COLORS.rim },
  };

  const c = configs[variant];

  return (
    <View
      style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: c.color }]} />}
      <Text variant="caption" color={c.color} weight="medium">
        {label}
      </Text>
    </View>
  );
};

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
