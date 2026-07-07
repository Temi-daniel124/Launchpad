import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from "react-native";
import { Text } from "./Text";
import { COLORS, RADIUS } from "../../constants/theme";

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  secured?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secured,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(labelAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 6],
  });

  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.fog, isFocused ? COLORS.indigo : COLORS.slate],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          error ? styles.errored : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <View style={styles.inputContainer}>
          <Animated.Text
            style={[
              styles.label,
              {
                top: labelTop,
                fontSize: labelSize,
                color: labelColor,
                left: leftIcon ? 44 : 16,
              },
            ]}
          >
            {label}
          </Animated.Text>

          <TextInput
            style={[styles.input, { paddingLeft: leftIcon ? 44 : 16 }]}
            placeholderTextColor="transparent"
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secured && !showPassword}
            selectionColor={COLORS.indigo}
            {...rest}
          />
        </View>

        {(rightIcon || secured) && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={
              secured ? () => setShowPassword(!showPassword) : onRightIconPress
            }
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          variant="caption"
          color={COLORS.rose}
          style={{ marginTop: 4, marginLeft: 4 }}
        >
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text variant="caption" style={{ marginTop: 4, marginLeft: 4 }}>
          {hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    height: 58,
    overflow: "hidden",
  },
  focused: {
    borderColor: COLORS.indigo,
    backgroundColor: COLORS.elevated,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  errored: {
    borderColor: COLORS.rose,
  },
  inputContainer: { flex: 1, height: "100%" },
  label: {
    position: "absolute",
    fontFamily: "Outfit-Regular",
    zIndex: 1,
  },
  input: {
    flex: 1,
    color: COLORS.snow,
    fontFamily: "Outfit-Regular",
    fontSize: 15,
    paddingTop: 22,
    paddingBottom: 8,
    paddingRight: 16,
  },
  leftIcon: {
    position: "absolute",
    left: 14,
    zIndex: 2,
  },
  rightIcon: {
    paddingHorizontal: 14,
  },
});
