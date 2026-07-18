import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { House, Briefcase, Globe, FileText, User } from "phosphor-react-native";
import { Text } from "../../components/ui/Text";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabItem = {
  name: string;
  label: string;
  Icon: typeof House;
  badgeCount?: number;
};

const TABS: TabItem[] = [
  { name: "home/index", label: "Home", Icon: House },
  { name: "jobs/index", label: "Jobs", Icon: Briefcase },
  { name: "portfolio/index", label: "Portfolio", Icon: Globe },
  { name: "cv/index", label: "CV", Icon: FileText },
  { name: "profile/index", label: "Profile", Icon: User },
];

const webBackdropStyle = Platform.select<ViewStyle>({
  web: {
    backdropFilter: "blur(24px)",
  } as ViewStyle,
  default: {},
});

const blurIntensity = Platform.OS === "android" ? 16 : 24;

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function CustomTabBar({ state, navigation }: any) {
  const { colors: COLORS, theme, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const insets = useSafeAreaInsets();
  const isDarkTheme = theme === "dark";
  const glassSurface = withAlpha(COLORS.navy, isDarkTheme ? 0.76 : 0.72);
  const activeSurface = withAlpha(COLORS.indigo, isDarkTheme ? 0.16 : 0.12);
  const borderSurface = withAlpha(COLORS.rim, isDarkTheme ? 0.72 : 0.82);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarWrapper,
        { bottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={isDarkTheme ? "dark" : "light"}
        style={[
          styles.tabBar,
          webBackdropStyle,
          {
            backgroundColor: glassSurface,
            borderColor: borderSurface,
            shadowColor: COLORS.snow,
          },
        ]}
      >
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const Icon = tab.Icon;
          const badgeCount = tab.badgeCount ?? 0;

          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: state.routes[index].key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(state.routes[index].name);
                }
              }}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && [
                  styles.tabItemActive,
                  { backgroundColor: activeSurface },
                ],
                pressed && styles.tabItemPressed,
              ]}
            >
              <Icon
                size={20}
                color={isFocused ? COLORS.indigo : COLORS.fog}
                weight={isFocused ? "fill" : "regular"}
              />
              {badgeCount && badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text
                    numberOfLines={1}
                    style={styles.badgeText}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              ) : null}
              <Text
                variant="caption"
                numberOfLines={1}
                color={isFocused ? COLORS.indigo : COLORS.fog}
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tabs.Screen name="home/index" options={{ title: "Home" }} />
      <Tabs.Screen name="jobs/index" options={{ title: "Jobs" }} />
      <Tabs.Screen name="portfolio/index" options={{ title: "Portfolio" }} />
      <Tabs.Screen name="cv/index" options={{ title: "CV" }} />
      <Tabs.Screen name="profile/index" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  tabBarWrapper: {
    alignItems: "center",
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  tabBar: {
    borderRadius: 999,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: 4,
    maxWidth: 520,
    minHeight: 64,
    overflow: "hidden",
    padding: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    width: "100%",
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 48,
    paddingHorizontal: 6,
    position: "relative",
  },
  tabItemActive: {
    borderRadius: 999,
  },
  tabItemPressed: {
    opacity: 0.72,
  },
  tabLabel: {
    fontFamily: "Outfit-Regular",
    fontSize: 10,
    letterSpacing: 0,
  },
  tabLabelActive: {
    fontFamily: "Outfit-SemiBold",
  },
  badge: {
    alignItems: "center",
    backgroundColor: COLORS.rose,
    borderRadius: 999,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
    position: "absolute",
    right: 6,
    top: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontFamily: "Outfit-SemiBold",
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 12,
  },
});
