import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Star } from "phosphor-react-native";
import { supabase } from "../../lib/supabase";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { Text } from "./Text";
import { Button } from "./Button";

type GenerationFeature = "portfolio" | "cv" | "cover_letter";

type Props = {
  visible: boolean;
  userId: string | null | undefined;
  feature: GenerationFeature;
  artifactId?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function GenerationFeedbackPrompt({
  visible,
  userId,
  feature,
  artifactId,
  onClose,
  onSubmitted,
}: Props) {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [missing, setMissing] = useState("");
  const [learning, setLearning] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!userId || rating < 1) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("generation_feedback" as any).insert({
        user_id: userId,
        feature,
        artifact_id: artifactId || null,
        rating,
        liked_text: liked.trim() || null,
        missing_text: missing.trim() || null,
        product_learning_text: learning.trim() || null,
      });
      if (error) throw error;
      onSubmitted?.();
      onClose();
      setRating(0);
      setLiked("");
      setMissing("");
      setLearning("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="h2" color={COLORS.snow} style={{ marginBottom: 8 }}>
            How did this feel?
          </Text>
          <Text variant="body" color={COLORS.slate} style={{ marginBottom: 20 }}>
            This helps us improve Launchpad. Your answer is private and never appears in generated content.
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setRating(value)}
                activeOpacity={0.8}
                style={styles.starButton}
              >
                <Star
                  size={30}
                  color={value <= rating ? COLORS.gold : COLORS.fog}
                  weight={value <= rating ? "fill" : "regular"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <FeedbackInput
            label="What did you like?"
            value={liked}
            onChangeText={setLiked}
          />
          <FeedbackInput
            label="What did you expect but not see?"
            value={missing}
            onChangeText={setMissing}
          />
          <FeedbackInput
            label="What would make the next result more useful?"
            value={learning}
            onChangeText={setLearning}
          />

          <View style={{ gap: 12, marginTop: 12 }}>
            <Button
              title={saving ? "Saving" : "Send Feedback"}
              onPress={submit}
              disabled={rating < 1 || saving}
            />
            {saving && <ActivityIndicator color={COLORS.emerald} />}
            <Button title="Not Now" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FeedbackInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="label" color={COLORS.snow} style={{ marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholder="Optional"
        placeholderTextColor={COLORS.fog}
        style={styles.input}
      />
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.abyss,
  },
  content: {
    padding: 24,
    paddingTop: 36,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.rim,
    backgroundColor: COLORS.elevated,
    color: COLORS.snow,
    padding: 14,
    textAlignVertical: "top",
  },
});
