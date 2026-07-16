import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { Button } from "./Button";
import { GlassCard } from "./GlassCard";
import { COLORS, RADIUS } from "../../constants/theme";
import {
  CheckSquare,
  Square,
  Sparkle,
  WarningCircle,
  GithubLogo,
} from "phosphor-react-native";

interface GapField {
  key: string;
  label: string;
  description: string;
  filled: boolean;
}

interface ProfileGapModalProps {
  visible: boolean;
  onClose: () => void;
  onProceed: (fieldsToGenerate: string[], drafts?: Record<string, string | string[] | number>) => void;
  profile: any;
  mode: "portfolio" | "cv";
}

const BLOCKED_GENERATION_CAREERS = ["Brand Designer"];

export const ProfileGapModal: React.FC<ProfileGapModalProps> = ({
  visible,
  onClose,
  onProceed,
  profile,
  mode,
}) => {
  const selectedCareer = String(profile?.career_type || profile?.job_title || "")
    .trim()
    .toLowerCase();
  const isBlockedCareer = BLOCKED_GENERATION_CAREERS.some(
    (career) => career.toLowerCase() === selectedCareer,
  );

  const getGapFields = (): GapField[] => {
    // These are fields AI CAN intelligently fill based on job title/industry
    const fields: GapField[] = [
      {
        key: "bio",
        label: "Professional Bio",
        description: "2-3 sentence summary of your career",
        filled: !!profile?.bio,
      },
      {
        key: "job_title",
        label: "Job Title",
        description: "Your current or target role",
        filled: !!profile?.job_title,
      },
      {
        key: "skills",
        label: "Skills",
        description: "8 key professional skills",
        filled: !!(profile?.skills && profile.skills.length > 0),
      },
      {
        key: "experience_years",
        label: "Years of Experience",
        description: "How long you have been working",
        filled: !!profile?.experience_years,
      },
      {
        key: "target_countries",
        label: "Target Countries",
        description: "Where you want to work",
        filled: !!(
          profile?.target_countries && profile.target_countries.length > 0
        ),
      },
    ];

    if (mode === "portfolio") {
      // Note: GitHub username is NOT AI-fillable - it's a real account identifier
      // If missing, we show a separate prompt below
      fields.push({
        key: "tagline",
        label: "Professional Tagline",
        description: "One powerful headline for your portfolio",
        filled: !!profile?.tagline,
      });
    }

    return fields;
  };

  const isTechFamily =
    profile?.layout_family === "tech_project_evidence" ||
    profile?.career_group === "tech" ||
    profile?.profession_type === "tech";
  // Check separately if GitHub is missing for technical portfolio mode.
  const needsGithub = mode === "portfolio" && isTechFamily && !profile?.github_username;

  const gaps = getGapFields().filter((f) => !f.filled);
  const filled = getGapFields().filter((f) => f.filled);
  const [selectedToGenerate, setSelectedToGenerate] = useState<string[]>(
    gaps.map((g) => g.key),
  );
  const [reviewingDrafts, setReviewingDrafts] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const toggleField = (key: string) => {
    setSelectedToGenerate((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const hasGaps = gaps.length > 0;

  const createDrafts = () => {
    const title = profile?.job_title || profile?.career_type || "professional";
    const nextDrafts: Record<string, string> = {};
    selectedToGenerate.forEach((field) => {
      if (field === "bio") {
        nextDrafts.bio = `A focused ${title} with ${profile?.experience_years || profile?.years_experience_exact || "relevant"} years of experience, known for clear communication, reliable delivery, and practical outcomes.`;
      }
      if (field === "job_title") nextDrafts.job_title = title;
      if (field === "skills") {
        nextDrafts.skills = "Communication, Problem Solving, Planning, Execution";
      }
      if (field === "experience_years") {
        nextDrafts.experience_years = String(profile?.years_experience_exact || profile?.experience_years || "3");
      }
      if (field === "target_countries") {
        nextDrafts.target_countries = "United Kingdom, Canada, Nigeria";
      }
      if (field === "tagline") {
        nextDrafts.tagline = `Practical ${title} support with clear execution and dependable results.`;
      }
    });
    setDrafts(nextDrafts);
    setReviewingDrafts(true);
  };

  const submitDrafts = () => {
    const parsed: Record<string, string | string[] | number> = {};
    for (const [key, value] of Object.entries(drafts)) {
      if (key === "skills" || key === "target_countries") {
        parsed[key] = value.split(",").map((item) => item.trim()).filter(Boolean);
      } else if (key === "experience_years") {
        parsed[key] = Number(value) || value;
      } else {
        parsed[key] = value.trim();
      }
    }
    onProceed(selectedToGenerate, parsed);
  };

  if (isBlockedCareer) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
          <LinearGradient
            colors={["rgba(79,70,229,0.15)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconBox}>
                <WarningCircle size={28} color={COLORS.gold} weight="fill" />
              </View>
              <Text variant="h2" style={{ marginTop: 16, marginBottom: 8 }}>
                Brand Designer is not available yet
              </Text>
              <Text
                variant="body"
                align="center"
                style={{ paddingHorizontal: 16 }}
              >
                This career is still being prepared for Launchpad generation.
                Choose another career for now, or wait until Brand Designer is
                approved.
              </Text>
            </View>
            <Button title="Close" onPress={onClose} variant="ghost" size="lg" />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
        <LinearGradient
          colors={["rgba(79,70,229,0.15)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Sparkle size={28} color={COLORS.indigo} weight="fill" />
            </View>
            <Text variant="h2" style={{ marginTop: 16, marginBottom: 8 }}>
              {hasGaps || needsGithub
                ? "Profile Check"
                : "Profile Looks Great!"}
            </Text>
            <Text
              variant="body"
              align="center"
              style={{ paddingHorizontal: 16 }}
            >
              {hasGaps
                ? `We found ${gaps.length} incomplete ${gaps.length === 1 ? "field" : "fields"}. Let AI fill them in perfectly for your ${mode}.`
                : needsGithub
                  ? "Your profile is complete. You can still connect GitHub to use your real projects."
                  : `Your profile is complete. Ready to generate your ${mode}.`}
            </Text>
          </View>

          {/* GitHub missing notice (portfolio only) - NOT AI fillable */}
          {needsGithub && (
            <GlassCard
              style={{ marginBottom: 20, borderColor: `${COLORS.gold}44` }}
              padding={16}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <GithubLogo size={22} color={COLORS.gold} weight="fill" />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="label"
                    color={COLORS.snow}
                    style={{ marginBottom: 4 }}
                  >
                    GitHub Not Connected
                  </Text>
                  <Text variant="caption" color={COLORS.slate}>
                    Without GitHub, your portfolio will show placeholder
                    projects. Connect it in Profile Settings or continue anyway.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      router.push("/(tabs)/profile" as any);
                    }}
                    style={styles.connectGithubBtn}
                    activeOpacity={0.8}
                  >
                    <Text
                      variant="caption"
                      color={COLORS.indigo}
                      weight="semibold"
                    >
                      Go to Profile Settings
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Gap fields - AI can fill */}
          {hasGaps && (
            <>
              <Text
                variant="label"
                color={COLORS.snow}
                style={{ marginBottom: 12 }}
              >
                Let AI fill these automatically:
              </Text>
              <GlassCard style={{ marginBottom: 20 }} padding={0}>
                {gaps.map((field, index) => (
                  <TouchableOpacity
                    key={field.key}
                    style={[
                      styles.fieldRow,
                      index < gaps.length - 1 && styles.fieldBorder,
                    ]}
                    onPress={() => toggleField(field.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.fieldInfo}>
                      <WarningCircle
                        size={16}
                        color={COLORS.gold}
                        weight="fill"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text variant="label" color={COLORS.snow}>
                          {field.label}
                        </Text>
                        <Text variant="caption">{field.description}</Text>
                      </View>
                    </View>
                    {selectedToGenerate.includes(field.key) ? (
                      <CheckSquare
                        size={22}
                        color={COLORS.indigo}
                        weight="fill"
                      />
                    ) : (
                      <Square size={22} color={COLORS.fog} />
                    )}
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </>
          )}

          {/* Already filled fields */}
          {filled.length > 0 && (
            <>
              <Text
                variant="label"
                color={COLORS.slate}
                style={{ marginBottom: 12 }}
              >
                Already completed:
              </Text>
              <GlassCard padding={0}>
                {filled.map((field, index) => (
                  <View
                    key={field.key}
                    style={[
                      styles.fieldRow,
                      index < filled.length - 1 && styles.fieldBorder,
                    ]}
                  >
                    <View style={styles.fieldInfo}>
                      <CheckSquare
                        size={16}
                        color={COLORS.emerald}
                        weight="fill"
                      />
                      <Text
                        variant="label"
                        color={COLORS.slate}
                        style={{ marginLeft: 10 }}
                      >
                        {field.label}
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          <View style={{ height: 32 }} />

          {reviewingDrafts && (
            <GlassCard variant="bordered" padding={14} style={{ marginBottom: 20 }}>
              <Text variant="label" color={COLORS.snow} style={{ marginBottom: 12 }}>
                Review Alex's draft before saving
              </Text>
              {Object.entries(drafts).map(([key, value]) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text variant="caption" color={COLORS.slate} style={{ marginBottom: 6 }}>
                    {key.replace(/_/g, " ")}
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={(textValue) =>
                      setDrafts((current) => ({ ...current, [key]: textValue }))
                    }
                    multiline
                    style={styles.reviewInput}
                    placeholderTextColor={COLORS.fog}
                  />
                </View>
              ))}
            </GlassCard>
          )}

          {/* Alex note */}
          {hasGaps && selectedToGenerate.length > 0 && (
            <GlassCard
              variant="bordered"
              padding={14}
              style={{ marginBottom: 20 }}
            >
              <Text variant="caption" color={COLORS.cyan}>
                Alex will draft {selectedToGenerate.length} field
                {selectedToGenerate.length > 1 ? "s" : ""} based on your job
                title, industry, and profile. You can edit the draft before it
                is saved to your profile.
              </Text>
            </GlassCard>
          )}

          {/* Buttons */}
          <View style={{ gap: 12, paddingBottom: 40 }}>
            <Button
              title={
                reviewingDrafts
                  ? `Save Drafts + ${mode === "cv" ? "CV" : "Portfolio"}`
                  : hasGaps && selectedToGenerate.length > 0
                  ? `Draft ${selectedToGenerate.length} Field${selectedToGenerate.length > 1 ? "s" : ""} with Alex`
                  : `Proceed with ${mode === "cv" ? "CV" : "Portfolio"}`
              }
              onPress={() => {
                if (reviewingDrafts) {
                  submitDrafts();
                } else if (hasGaps && selectedToGenerate.length > 0) {
                  createDrafts();
                } else {
                  onProceed(selectedToGenerate);
                }
              }}
              size="lg"
            />
            <Button
              title="Cancel"
              onPress={onClose}
              variant="ghost"
              size="lg"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 32 },
  header: { alignItems: "center", marginBottom: 32 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(79,70,229,0.15)",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.rim },
  fieldInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  connectGithubBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.indigo}55`,
    backgroundColor: `${COLORS.indigo}11`,
    alignSelf: "flex-start",
  },
  reviewInput: {
    minHeight: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
    backgroundColor: COLORS.elevated,
    color: COLORS.snow,
    padding: 12,
    textAlignVertical: "top",
  },
});
