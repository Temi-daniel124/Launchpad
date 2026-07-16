import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { Tabs } from "expo-router";
import { House, Briefcase, Globe, FileText, User } from "phosphor-react-native";
import { Text } from "../../components/ui/Text";
import { COLORS } from "../../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = [
  { name: "home/index", label: "Home", Icon: House },
  { name: "jobs/index", label: "Jobs", Icon: Briefcase },
  { name: "portfolio/index", label: "Portfolio", Icon: Globe },
  { name: "cv/index", label: "CV", Icon: FileText },
  { name: "profile/index", label: "Profile", Icon: User },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 12 }]}
    >
      <View style={styles.topBorder} />
      <View style={styles.tabsRow}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const Icon = tab.Icon;

          return (
            <TouchableOpacity
              key={tab.name}
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
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View
                style={[styles.tabInner, isFocused && styles.tabInnerActive]}
              >
                <Icon
                  size={22}
                  color={isFocused ? COLORS.indigo : COLORS.fog}
                  weight={isFocused ? "fill" : "regular"}
                />
                <Text
                  variant="caption"
                  color={isFocused ? COLORS.indigo : COLORS.fog}
                  style={{
                    marginTop: 3,
                    fontFamily: isFocused
                      ? "Outfit-SemiBold"
                      : "Outfit-Regular",
                    fontSize: 10,
                  }}
                >
                  {tab.label}
                </Text>
                {isFocused && <View style={styles.activeDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
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

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: COLORS.navy,
  },
  topBorder: {
    height: 1,
    backgroundColor: COLORS.rim,
  },
  tabsRow: {
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 56,
    position: "relative",
  },
  tabInnerActive: {
    backgroundColor: COLORS.elevated,
    borderColor: COLORS.rim,
    borderWidth: 1,
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.indigo,
  },
});
