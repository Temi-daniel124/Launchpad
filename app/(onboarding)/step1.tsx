import React, { useState, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { InputField } from "../../components/ui/InputField";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { Briefcase } from "phosphor-react-native";

// -----------------------------------------------------------------------------
// TECH JOBS , require GitHub, routed to step2 (GitHub connect)
// -----------------------------------------------------------------------------
const TECH_JOBS = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Web Developer",
  "Software Developer",
  "Software Engineer",
  "Mobile App Developer",
  "React Developer",
  "Node.js Developer",
  "Python Developer",
  "JavaScript Developer",
  "WordPress Developer",
  "Automation Engineer",
  "Data Analyst",
  "Data Scientist",
  "QA Automation Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Cybersecurity Analyst",
  "Cybersecurity Engineer",
  "Technical Support Engineer",
  "Mobile Developer",
  "Business Analyst",
];

// NON-TECH / Design jobs , skip GitHub step, routed to step3
const DESIGN_JOBS = [
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Brand Designer",
  "Visual Designer",
  "Social Media Designer",
  "Motion Designer",
  "Video Editor",
  "Thumbnail Designer",
  "Logo Designer",
  "Web Designer",
  "Landing Page Designer",
  "Packaging Designer",
  "Illustrator",
  "Canva Designer",
  "Figma Designer",
  "Creative Designer",
  "Marketing Designer",
  "UI Designer",
  "UX Designer",
  "Product Manager",
  "Marketing Manager",
];

const ALL_JOB_SUGGESTIONS = [...TECH_JOBS, ...DESIGN_JOBS];
const BLOCKED_CAREERS = ["Brand Designer"];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Marketing",
  "Design",
  "Education",
  "Engineering",
  "Consulting",
  "Media",
  "Legal",
  "Sales",
  "Operations",
];

const EXPERIENCE_LEVELS = [
  { key: "student", label: "Student", desc: "Currently studying" },
  { key: "junior", label: "Junior", desc: "0 to 2 years" },
  { key: "mid", label: "Mid-level", desc: "3 to 5 years" },
  { key: "senior", label: "Senior", desc: "6+ years" },
];

// -----------------------------------------------------------------------------
// Helper: detect tech vs design profession
// -----------------------------------------------------------------------------
function isTechJob(title: string): boolean {
  const lower = title.toLowerCase().trim();
  // Exact match first
  if (TECH_JOBS.some((j) => j.toLowerCase() === lower)) return true;
  if (DESIGN_JOBS.some((j) => j.toLowerCase() === lower)) return false;
  // Keyword fallback for free-typed titles
  return /developer|engineer|analyst|devops|cybersecurity|automation|programmer|coder|backend|frontend|fullstack|full.stack|data scientist|qa |sre|architect/.test(
    lower,
  );
}

function isBlockedCareer(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return BLOCKED_CAREERS.some((career) => career.toLowerCase() === lower);
}

// -----------------------------------------------------------------------------
// SCREEN
// -----------------------------------------------------------------------------
export default function Step1Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredSuggestions = ALL_JOB_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(jobTitle.toLowerCase()) && jobTitle.length > 0,
  );

  const handleNext = useCallback(async () => {
    if (!jobTitle.trim()) return showToast("Enter your job title", "error");
    if (!industry) return showToast("Select your industry", "error");
    if (!experienceLevel)
      return showToast("Select your experience level", "error");
    if (isBlockedCareer(jobTitle)) {
      return showToast(
        "Brand Designer is not available yet. Choose another career for now.",
        "error",
      );
    }

    const professionType = isTechJob(jobTitle) ? "tech" : "design";

    setLoading(true);
    try {
      await updateProfile({
        job_title: jobTitle.trim(),
        industry,
        experience_level: experienceLevel,
        profession_type: professionType as any,
      });
    } finally {
      setLoading(false);
    }

    // Tech users to step2 (GitHub connection)
    // Design/non-tech users to step3 (skip GitHub)
    if (professionType === "tech") {
      router.push("/(onboarding)/step2");
    } else {
      router.push("/(onboarding)/step3");
    }
  }, [jobTitle, industry, experienceLevel]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <OnboardingProgress currentStep={1} totalSteps={7} />
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconRow}>
            <LinearGradient
              colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.12)"]}
              style={styles.iconGradient}
            >
              <Briefcase size={32} color={COLORS.indigo} weight="duotone" />
            </LinearGradient>
          </View>

          <Text variant="h1" style={{ marginBottom: 8 }}>
            What do you do?
          </Text>
          <Text variant="bodyLarge" style={{ marginBottom: 32 }}>
            This helps us personalise your portfolio, CV, and job matches.
          </Text>

          {/* Job Title with Autocomplete */}
          <View style={{ marginBottom: 16, zIndex: 10 }}>
            <InputField
              label="Job Title"
              value={jobTitle}
              onChangeText={(text) => {
                setJobTitle(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(jobTitle.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoCapitalize="words"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {filteredSuggestions.slice(0, 6).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.suggestionItem,
                      isBlockedCareer(s) && styles.suggestionItemDisabled,
                    ]}
                    onPress={() => {
                      if (isBlockedCareer(s)) {
                        showToast(
                          "Brand Designer is not available yet. Choose another career for now.",
                          "error",
                        );
                        return;
                      }
                      setJobTitle(s);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text variant="body" color={COLORS.snow}>
                      {s}
                    </Text>
                    {/* Visual cue for type */}
                    <Text
                      variant="caption"
                      color={
                        isBlockedCareer(s)
                          ? COLORS.slate
                          : isTechJob(s)
                            ? COLORS.indigo
                            : COLORS.gold
                      }
                      style={{ fontSize: 10 }}
                    >
                      {isBlockedCareer(s)
                        ? "Unavailable"
                        : isTechJob(s)
                          ? "Tech"
                          : "Design"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Industry */}
          <Text
            variant="label"
            color={COLORS.snow}
            style={{ marginBottom: 12 }}
          >
            Industry
          </Text>
          <View style={styles.chipGrid}>
            {INDUSTRIES.map((ind) => (
              <TouchableOpacity
                key={ind}
                style={[styles.chip, industry === ind && styles.chipSelected]}
                onPress={() => setIndustry(ind)}
              >
                <Text
                  variant="caption"
                  color={industry === ind ? COLORS.white : COLORS.slate}
                  weight={industry === ind ? "semibold" : "regular"}
                >
                  {ind}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Experience Level */}
          <Text
            variant="label"
            color={COLORS.snow}
            style={{ marginTop: 24, marginBottom: 12 }}
          >
            Experience Level
          </Text>
          <View style={{ gap: 10 }}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.levelCard,
                  experienceLevel === level.key && styles.levelCardSelected,
                ]}
                onPress={() => setExperienceLevel(level.key)}
              >
                <View
                  style={[
                    styles.levelRadio,
                    experienceLevel === level.key && styles.levelRadioSelected,
                  ]}
                >
                  {experienceLevel === level.key && (
                    <View style={styles.levelRadioDot} />
                  )}
                </View>
                <View>
                  <Text
                    variant="label"
                    color={
                      experienceLevel === level.key ? COLORS.snow : COLORS.slate
                    }
                  >
                    {level.label}
                  </Text>
                  <Text variant="caption">{level.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

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

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  iconRow: { marginBottom: 24, alignSelf: "flex-start" },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
  },
  suggestions: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.rim,
    zIndex: 100,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestionItemDisabled: {
    opacity: 0.55,
  },
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
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  levelCardSelected: {
    borderColor: COLORS.indigo,
    backgroundColor: "rgba(21,154,99,0.12)",
  },
  levelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  levelRadioSelected: { borderColor: COLORS.indigo },
  levelRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.indigo,
  },
});
