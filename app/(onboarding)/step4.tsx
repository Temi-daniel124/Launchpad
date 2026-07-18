import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Image,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { OnboardingProgress } from "../../components/ui/OnboardingProgress";
import { Toast } from "../../components/ui/Toast";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../contexts/ThemeContext";
import { Camera, UserCircle, ArrowRight } from "phosphor-react-native";

export default function Step4Screen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { user, updateProfile } = useAuthStore();
  const { showToast } = useUIStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return showToast("Camera roll permission required", "error");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async () => {
    if (!photoUri || !user) return;
    setLoading(true);
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileName = `${user.id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);
      await updateProfile({ profile_photo_url: data.publicUrl });
      showToast("Photo uploaded!", "success");
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (photoUri) await uploadPhoto();
    router.push("/(onboarding)/step5");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <OnboardingProgress currentStep={4} totalSteps={7} />
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, alignItems: "center" }}
        >
          <View style={{ height: 24 }} />
          <Text variant="h1" align="center" style={{ marginBottom: 8 }}>
            Add a Profile Photo
          </Text>
          <Text variant="bodyLarge" align="center" style={{ marginBottom: 40 }}>
            A professional photo builds trust with recruiters. You can skip
            this.
          </Text>

          <TouchableOpacity
            onPress={pickImage}
            style={styles.photoContainer}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <LinearGradient
                colors={["rgba(21,154,99,0.12)", "rgba(21,154,99,0.08)"]}
                style={styles.photoPlaceholder}
              >
                <UserCircle size={80} color={COLORS.fog} weight="thin" />
              </LinearGradient>
            )}
            <View style={styles.cameraBtn}>
              <LinearGradient
                colors={[COLORS.indigo, COLORS.cyan]}
                style={styles.cameraBtnGrad}
              >
                <Camera size={18} color="#fff" weight="bold" />
              </LinearGradient>
            </View>
          </TouchableOpacity>

          <Text variant="caption" align="center" style={{ marginTop: 16 }}>
            Tap the circle to choose a photo
          </Text>

          <View style={{ flex: 1 }} />

          <View style={{ width: "100%", gap: 12, paddingBottom: 32 }}>
            <Button
              title={
                loading
                  ? "Uploading..."
                  : photoUri
                    ? "Save & Continue"
                    : "Continue"
              }
              onPress={handleNext}
              loading={loading}
              size="lg"
            />
            <Button
              title="Skip for now"
              onPress={() => router.push("/(onboarding)/step5")}
              variant="ghost"
              size="lg"
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  photoContainer: { position: "relative", width: 160, height: 160 },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: COLORS.indigo,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.rim,
  },
  cameraBtn: { position: "absolute", bottom: 4, right: 4 },
  cameraBtnGrad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.abyss,
  },
});
