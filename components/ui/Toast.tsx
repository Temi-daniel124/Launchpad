import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { COLORS, RADIUS } from "../../constants/theme";
import { useUIStore } from "../../stores/uiStore";
import { CheckCircle, XCircle, Info } from "phosphor-react-native";

export const Toast: React.FC = () => {
  const { toast, hideToast } = useUIStore();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => hideToast());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  const configs = {
    success: {
      bg: "rgba(16, 185, 129, 0.15)",
      border: COLORS.emerald,
      Icon: CheckCircle,
      iconColor: COLORS.emerald,
    },
    error: {
      bg: "rgba(244, 63, 94, 0.15)",
      border: COLORS.rose,
      Icon: XCircle,
      iconColor: COLORS.rose,
    },
    info: {
      bg: "rgba(21,154,99,0.12)",
      border: COLORS.indigo,
      Icon: Info,
      iconColor: COLORS.indigo,
    },
  };

  const config = configs[toast.type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <config.Icon size={20} color={config.iconColor} weight="fill" />
      <Text
        variant="label"
        color={COLORS.snow}
        style={{ flex: 1, marginLeft: 10 }}
      >
        {toast.message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});
