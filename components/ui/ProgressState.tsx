import React from "react";
import { StyleSheet, View } from "react-native";
import { CheckCircle } from "phosphor-react-native";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { Text } from "./Text";

interface ProgressStateProps {
  title: string;
  steps: string[];
  activeStep?: number;
}

export const ProgressState: React.FC<ProgressStateProps> = ({
  title,
  steps,
  activeStep = 0,
}) => {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text variant="h2" color={COLORS.snow} style={{ marginBottom: 8 }}>
          {title}
        </Text>
        <Text variant="body" color={COLORS.slate} style={{ marginBottom: 16 }}>
          This usually takes a few seconds.
        </Text>
        <View style={styles.steps}>
          {steps.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <View key={step} style={styles.step}>
                {done ? (
                  <CheckCircle size={18} color={COLORS.indigo} weight="fill" />
                ) : (
                  <View
                    style={[
                      styles.dot,
                      {
                        borderColor: active ? COLORS.indigo : COLORS.fog,
                        backgroundColor: active
                          ? COLORS.indigo
                          : COLORS.transparent,
                      },
                    ]}
                  />
                )}
                <Text
                  variant="body"
                  color={active || done ? COLORS.snow : COLORS.slate}
                  style={{ flex: 1 }}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.abyss,
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 24,
    ...SHADOWS.card,
  },
  steps: {
    gap: 12,
  },
  step: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  dot: {
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    width: 18,
  },
});

