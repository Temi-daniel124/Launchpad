import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
  onProceed: (fieldsToGenerate: string[]) => void;
  profile: any;
  mode: "portfolio" | "cv";
}

export const ProfileGapModal: React.FC<ProfileGapModalProps> = ({
  visible,
  onClose,
  onProceed,
  profile,
  mode,
}) => {
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

  // Check separately if GitHub is missing for portfolio mode
  const needsGithub = mode === "portfolio" && !profile?.github_username;

  const gaps = getGapFields().filter((f) => !f.filled);
  const filled = getGapFields().filter((f) => f.filled);
  const [selectedToGenerate, setSelectedToGenerate] = useState<string[]>(
    gaps.map((g) => g.key),
  );

  const toggleField = (key: string) => {
    setSelectedToGenerate((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const hasGaps = gaps.length > 0;

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

          {/* GitHub missing notice (portfolio only) — NOT AI fillable */}
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

          {/* Gap fields — AI can fill */}
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

          {/* AI note */}
          {hasGaps && selectedToGenerate.length > 0 && (
            <GlassCard
              variant="bordered"
              padding={14}
              style={{ marginBottom: 20 }}
            >
              <Text variant="caption" color={COLORS.cyan}>
                AI will generate {selectedToGenerate.length} field
                {selectedToGenerate.length > 1 ? "s" : ""} based on your job
                title, industry, and profile. All generated content will be
                saved to your profile and will match across your CV and
                portfolio.
              </Text>
            </GlassCard>
          )}

          {/* Buttons */}
          <View style={{ gap: 12, paddingBottom: 40 }}>
            <Button
              title={
                hasGaps && selectedToGenerate.length > 0
                  ? `Generate ${selectedToGenerate.length} Field${selectedToGenerate.length > 1 ? "s" : ""} + ${mode === "cv" ? "CV" : "Portfolio"}`
                  : `Proceed with ${mode === "cv" ? "CV" : "Portfolio"}`
              }
              onPress={() => onProceed(selectedToGenerate)}
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
});
