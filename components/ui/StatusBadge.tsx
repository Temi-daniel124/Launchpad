import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { COLORS, RADIUS } from "../../constants/theme";

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
      bg: "rgba(79,70,229,0.15)",
      color: COLORS.indigoLight,
      border: "rgba(79,70,229,0.3)",
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

const styles = StyleSheet.create({
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
