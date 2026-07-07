import React from "react";
import { Text as RNText, TextStyle, StyleSheet, StyleProp } from "react-native";
import { COLORS } from "../../constants/theme";

interface TextProps {
  children: React.ReactNode;
  variant?:
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "body"
    | "bodyLarge"
    | "caption"
    | "label"
    | "mono";
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: "left" | "center" | "right";
  weight?: "light" | "regular" | "medium" | "semibold" | "bold";
  onPress?: () => void;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = "body",
  color,
  style,
  numberOfLines,
  align = "left",
  weight,
  onPress,
}) => {
  const getStyle = (): TextStyle => {
    const base: TextStyle = {
      color: color || COLORS.snow,
      textAlign: align,
    };

    switch (variant) {
      case "display":
        return {
          ...base,
          fontFamily: weight === "bold" ? "ClashDisplayBold" : "ClashDisplay",
          fontSize: 36,
          lineHeight: 44,
          letterSpacing: -0.5,
        };
      case "h1":
        return {
          ...base,
          fontFamily: "ClashDisplay",
          fontSize: 28,
          lineHeight: 36,
          letterSpacing: -0.3,
        };
      case "h2":
        return {
          ...base,
          fontFamily: "ClashDisplay",
          fontSize: 22,
          lineHeight: 30,
        };
      case "h3":
        return {
          ...base,
          fontFamily: "Outfit-SemiBold",
          fontSize: 18,
          lineHeight: 26,
        };
      case "bodyLarge":
        return {
          ...base,
          fontFamily: "Outfit-Regular",
          fontSize: 16,
          lineHeight: 24,
          color: color || COLORS.slate,
        };
      case "body":
        return {
          ...base,
          fontFamily: "Outfit-Regular",
          fontSize: 14,
          lineHeight: 22,
          color: color || COLORS.slate,
        };
      case "caption":
        return {
          ...base,
          fontFamily: "Outfit-Regular",
          fontSize: 12,
          lineHeight: 18,
          color: color || COLORS.fog,
        };
      case "label":
        return {
          ...base,
          fontFamily: "Outfit-Medium",
          fontSize: 13,
          lineHeight: 20,
          letterSpacing: 0.2,
        };
      case "mono":
        return {
          ...base,
          fontFamily: "JetBrainsMono-Regular",
          fontSize: 13,
          lineHeight: 20,
          color: color || COLORS.cyan,
        };
      default:
        return base;
    }
  };

  const weightFontMap: Record<string, string> = {
    light: "Outfit-Light",
    regular: "Outfit-Regular",
    medium: "Outfit-Medium",
    semibold: "Outfit-SemiBold",
    bold: "Outfit-Bold",
  };

  const computedStyle = getStyle();
  if (weight && variant !== "display" && variant !== "h1" && variant !== "h2") {
    computedStyle.fontFamily = weightFontMap[weight];
  }

  return (
    <RNText
      style={[computedStyle, style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </RNText>
  );
};
