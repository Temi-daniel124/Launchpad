import React, { useRef } from "react";
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Animated,
} from "react-native";
import { Text } from "./Text";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  fullWidth = true,
  style,
}) => {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const heights = { sm: 40, md: 52, lg: 60 };
  const fontSizes = { sm: 13, md: 15, lg: 17 };

  const renderContent = () => (
    <View style={styles.contentRow}>
      {icon && iconPosition === "left" && (
        <View style={{ marginRight: 8 }}>{icon}</View>
      )}
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "ghost"
              ? COLORS.indigo
              : COLORS.white
          }
          size="small"
        />
      ) : (
        <Text
          variant="label"
          style={{
            fontSize: fontSizes[size],
            fontFamily: "Outfit-SemiBold",
            color:
              variant === "secondary"
                ? COLORS.indigo
                : variant === "ghost"
                  ? COLORS.slate
                  : COLORS.white,
          }}
        >
          {title}
        </Text>
      )}
      {icon && iconPosition === "right" && (
        <View style={{ marginLeft: 8 }}>{icon}</View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.base,
          { height: heights[size] },
          variant === "secondary" && styles.secondary,
          variant === "ghost" && styles.ghost,
          variant === "danger" && styles.danger,
          variant === "gold" && styles.warning,
          (disabled || loading) && styles.disabled,
          !fullWidth && { paddingHorizontal: 24, width: "auto" },
        ]}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: COLORS.indigo,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: "rgba(21, 154, 99, 0.12)",
    borderWidth: 1,
    borderColor: COLORS.indigo,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  danger: {
    backgroundColor: COLORS.rose,
  },
  warning: {
    backgroundColor: COLORS.gold,
  },
  disabled: {
    opacity: 0.5,
  },
});
