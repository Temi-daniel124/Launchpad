import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { COLORS } from "../../constants/theme";
import {
  Globe,
  Laptop,
  Buildings,
  MapPin,
  IdentificationCard,
} from "phosphor-react-native";

const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "Australia",
  "UAE",
  "Netherlands",
  "Ireland",
  "France",
  "Singapore",
  "New Zealand",
  "Sweden",
];

const JOB_TYPES = [
  { key: "remote", label: "Remote", icon: Laptop, desc: "Work from anywhere" },
  {
    key: "hybrid",
    label: "Hybrid",
    icon: Buildings,
    desc: "Mix of remote & office",
  },
  { key: "on-site", label: "On-site", icon: MapPin, desc: "Office-based role" },
];

export default function Step3Screen() {
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [jobType, setJobType] = useState("");
  const [visaNeeded, setVisaNeeded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleCountry = (country: string) => {
    setTargetCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country],
    );
  };

  const handleNext = async () => {
    if (targetCountries.length === 0)
      return showToast("Select at least one target country", "error");
    if (!jobType) return showToast("Select your preferred job type", "error");
    setLoading(true);
    await updateProfile({
      target_countries: targetCountries,
      job_type_preference: jobType as "remote" | "hybrid" | "on-site",
      visa_sponsorship_needed: visaNeeded,
    });
    setLoading(false);
    router.push("/(onboarding)/step4");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(245,158,11,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <OnboardingProgress currentStep={3} totalSteps={7} />
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h1" style={{ marginBottom: 8 }}>
            Your Preferences
          </Text>
          <Text variant="bodyLarge" style={{ marginBottom: 28 }}>
            Where do you want to work? We'll match you to opportunities there.
          </Text>

          {/* Target Countries */}
          <Text
            variant="label"
            color={COLORS.snow}
            style={{ marginBottom: 12 }}
          >
            <Globe size={14} color={COLORS.cyan} /> Target Countries
          </Text>
          <View style={styles.chipGrid}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country}
                style={[
                  styles.chip,
                  targetCountries.includes(country) && styles.chipSelected,
                ]}
                onPress={() => toggleCountry(country)}
              >
                <Text
                  variant="caption"
                  color={
                    targetCountries.includes(country)
                      ? COLORS.white
                      : COLORS.slate
                  }
                  weight={
                    targetCountries.includes(country) ? "semibold" : "regular"
                  }
                >
                  {country}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Job Type */}
          <Text
            variant="label"
            color={COLORS.snow}
            style={{ marginTop: 28, marginBottom: 12 }}
          >
            Preferred Job Type
          </Text>
          <View style={{ gap: 10 }}>
            {JOB_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeCard,
                    jobType === type.key && styles.typeCardSelected,
                  ]}
                  onPress={() => setJobType(type.key)}
                >
                  <Icon
                    size={22}
                    color={jobType === type.key ? COLORS.indigo : COLORS.fog}
                    weight="duotone"
                  />
                  <View>
                    <Text
                      variant="label"
                      color={jobType === type.key ? COLORS.snow : COLORS.slate}
                    >
                      {type.label}
                    </Text>
                    <Text variant="caption">{type.desc}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View
                    style={[
                      styles.radio,
                      jobType === type.key && styles.radioSelected,
                    ]}
                  >
                    {jobType === type.key && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Visa Sponsorship */}
          <TouchableOpacity
            style={[styles.visaCard, visaNeeded && styles.visaCardSelected]}
            onPress={() => setVisaNeeded(!visaNeeded)}
          >
            <IdentificationCard
              size={22}
              color={visaNeeded ? COLORS.gold : COLORS.fog}
              weight="duotone"
            />
            <View style={{ flex: 1 }}>
              <Text
                variant="label"
                color={visaNeeded ? COLORS.snow : COLORS.slate}
              >
                I need visa sponsorship
              </Text>
              <Text variant="caption">
                We'll only show jobs that offer sponsorship
              </Text>
            </View>
            <View style={[styles.toggle, visaNeeded && styles.toggleOn]}>
              <View
                style={[styles.toggleThumb, visaNeeded && styles.toggleThumbOn]}
              />
            </View>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
          <Button
            title="Continue"
            onPress={handleNext}
            loading={loading}
            size="lg"
          />
          <View style={{ height: 32 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  chipSelected: {
    backgroundColor: "rgba(21,154,99,0.12)",
    borderColor: COLORS.indigo,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  typeCardSelected: {
    borderColor: COLORS.indigo,
    backgroundColor: "rgba(21,154,99,0.12)",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: { borderColor: COLORS.indigo },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.indigo,
  },
  visaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    marginTop: 12,
  },
  visaCardSelected: {
    borderColor: COLORS.gold,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.rim,
    padding: 2,
  },
  toggleOn: { backgroundColor: COLORS.indigo },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.fog,
  },
  toggleThumbOn: { backgroundColor: COLORS.white, marginLeft: 20 },
});
