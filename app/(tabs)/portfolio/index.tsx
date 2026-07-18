import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Share,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";
import { GlassCard } from "../../../components/ui/GlassCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { ProfileGapModal } from "../../../components/ui/ProfileGapModal";
import { GenerationFeedbackPrompt } from "../../../components/ui/GenerationFeedbackPrompt";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../../contexts/ThemeContext";
import {
  Globe,
  Rocket,
  ShareNetwork,
  ArrowSquareOut,
  CheckCircle,
  Sparkle,
  GithubLogo,
  ArrowClockwise,
  Warning,
  DownloadSimple,
  Folder,
  Palette,
} from "phosphor-react-native";

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------
const ZIP_PENDING_TIMEOUT_MS = 90_000;

const TECH_PROGRESS_STEPS = [
  "Fetching your top GitHub projects",
  "Generating your bio with AI",
  "Building portfolio website",
  "Deploying to Vercel",
  "Portfolio is live!",
];

const DESIGN_PROGRESS_STEPS = [
  "Sourcing your portfolio projects",
  "Generating your bio and tagline with AI",
  "Building portfolio website",
  "Deploying to Vercel",
  "Portfolio is live!",
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
function formatDeployTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diffHours < 24) {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (date >= todayMidnight) return `Today at ${timeStr}`;
    return `Yesterday at ${timeStr}`;
  }
  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} at ${timeStr}`;
}

function getDeployStatus(dep: any): {
  label: string;
  variant: "success" | "error" | "warning" | "info";
} {
  if (dep.deploy_status === "READY")
    return { label: "Ready", variant: "success" };
  if (dep.deploy_status === "ERROR")
    return { label: "Failed", variant: "error" };
  const diffMs = new Date().getTime() - new Date(dep.deployed_at).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours > 24) return { label: "Timed Out", variant: "error" };
  return { label: "Building", variant: "warning" };
}

// -----------------------------------------------------------------------------
// MAIN SCREEN
// -----------------------------------------------------------------------------
export default function PortfolioScreen() {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = React.useMemo(() => createStyles(COLORS, RADIUS, SHADOWS), [COLORS, RADIUS, SHADOWS]);
  const { profile, fetchProfile, user, updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  const isTechFamily =
    (profile as any)?.layout_family === "tech_project_evidence" ||
    (profile as any)?.career_group === "tech" ||
    profile?.profession_type === "tech";
  const isDesignUser = !isTechFamily;

  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressDone, setProgressDone] = useState(false);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGapModal, setShowGapModal] = useState(false);
  const [zipDownloading, setZipDownloading] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [lastDeploymentId, setLastDeploymentId] = useState<string | null>(null);

  // Drive link state - for design users only
  const [driveLinkInput, setDriveLinkInput] = useState(
    (profile as any)?.design_portfolio_drive_url ?? "",
  );
  const [savingDriveLink, setSavingDriveLink] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const scrollRef = useRef<ScrollView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PROGRESS_STEPS = isDesignUser
    ? DESIGN_PROGRESS_STEPS
    : TECH_PROGRESS_STEPS;

  // Keep driveLinkInput in sync when profile loads
  useEffect(() => {
    if ((profile as any)?.design_portfolio_drive_url) {
      setDriveLinkInput((profile as any).design_portfolio_drive_url);
    }
  }, [profile]);

  // -- Setup ------------------------------------------------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadDeployments();

    if (!user) return;

    const channel = supabase
      .channel("portfolio-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "portfolio_deployments",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.deploy_status === "READY") {
            setLastDeploymentId(payload.new.id ?? null);
            handleGenerationComplete();
          } else if (payload.new.deploy_status === "ERROR") {
            clearProgressInterval();
            setGenerating(false);
            setProgressDone(false);
            showToast("Deployment failed. Please try again.", "error");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearProgressInterval();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]);

  // -- Progress animation -----------------------------------------------------
  useEffect(() => {
    if (!generating) return;
    clearProgressInterval();
    let step = 0;
    progressIntervalRef.current = setInterval(() => {
      if (step < PROGRESS_STEPS.length - 2) {
        step++;
        setProgressStep(step);
      } else {
        clearProgressInterval();
      }
    }, 8000);
    return () => clearProgressInterval();
  }, [generating]);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleGenerationComplete = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    clearProgressInterval();
    setProgressStep(PROGRESS_STEPS.length - 1);
    setProgressDone(true);

    if (user) await fetchProfile(user.id);
    await loadDeployments();

    setTimeout(() => {
      setGenerating(false);
      setProgressDone(false);
      setProgressStep(0);
      showToast("Portfolio is live.", "success");
      setShowFeedbackPrompt(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 2000);
  }, [user]);

  // -- Data loading -----------------------------------------------------------
  const loadDeployments = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("portfolio_deployments")
        .select("*")
        .eq("user_id", user.id)
        .order("deployed_at", { ascending: false })
        .limit(6);
      setDeployments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchProfile(user.id);
    await loadDeployments();
    setRefreshing(false);
  }, [user]);

  // -- ZIP state --------------------------------------------------------------
  const latestReadyDeployment = useMemo(
    () => deployments.find((d) => d.deploy_status === "READY"),
    [deployments],
  );
  const zipUrl: string | null = latestReadyDeployment?.zip_url ?? null;

  const zipPendingTooLong = useMemo(() => {
    if (!latestReadyDeployment || zipUrl) return false;
    const age =
      Date.now() - new Date(latestReadyDeployment.deployed_at).getTime();
    return age > ZIP_PENDING_TIMEOUT_MS;
  }, [latestReadyDeployment, zipUrl]);

  // -- Generate card bullets --------------------------------------------------
  const generateBullets = useMemo(() => {
    if (isDesignUser) {
      return [
        "Top portfolio projects showcased beautifully",
        "AI writes your bio and tagline",
        "Live Vercel deployment in minutes",
        "Share your extra projects via Google Drive",
      ];
    }
    return [
      "Top 6 GitHub projects sourced automatically",
      "AI writes your bio and tagline",
      "Live Vercel deployment in minutes",
      "Project ZIP with setup instructions included",
    ];
  }, [isDesignUser]);

  // -- Drive link handler (design users only) ---------------------------------
  const handleSaveDriveLink = useCallback(async () => {
    const trimmed = driveLinkInput.trim();
    if (!trimmed) return;
    const isValidDriveLink =
      trimmed.startsWith("https://drive.google.com") ||
      trimmed.startsWith("https://docs.google.com");
    if (!isValidDriveLink) {
      showToast("Please enter a valid Google Drive link", "error");
      return;
    }
    setSavingDriveLink(true);
    try {
      await updateProfile({ design_portfolio_drive_url: trimmed } as any);
      showToast("Drive link saved! Done", "success");
    } catch {
      showToast("Could not save link", "error");
    } finally {
      setSavingDriveLink(false);
    }
  }, [driveLinkInput]);

  // -- ZIP download -----------------------------------------------------------
  const handleDownloadZip = useCallback(async () => {
    if (!zipUrl) return;
    try {
      setZipDownloading(true);
      await Linking.openURL(zipUrl);
    } catch {
      showToast("Could not open download link", "error");
    } finally {
      setTimeout(() => setZipDownloading(false), 1500);
    }
  }, [zipUrl]);

  // -- Generation -------------------------------------------------------------
  const handleGeneratePress = useCallback(() => {
    const career = String((profile as any)?.career_type || profile?.job_title || "")
      .trim()
      .toLowerCase();
    if (career === "brand designer") {
      showToast(
        "Brand Designer portfolio generation is not available yet.",
        "error",
      );
      return;
    }

    if (profile?.portfolio_url) {
      Alert.alert(
        "Regenerate Portfolio",
        "This will rebuild your portfolio with your latest profile data. Your current URL stays the same.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Regenerate", onPress: () => setShowGapModal(true) },
        ],
      );
    } else {
      setShowGapModal(true);
    }
  }, [profile, showToast]);

  const handleProceedWithGeneration = useCallback(
    async (
      fieldsToGenerate: string[],
      drafts?: Record<string, string | string[] | number>,
    ) => {
      setShowGapModal(false);

      if (fieldsToGenerate.length > 0) {
        const updates: any = drafts ? { ...drafts } : {};
        if (fieldsToGenerate.includes("bio") && !profile?.bio) {
          updates.bio =
            updates.bio ||
            `A dedicated ${profile?.job_title || "professional"} with ${profile?.experience_years || 4}+ years of experience delivering practical results.`;
        }
        if (
          fieldsToGenerate.includes("skills") &&
          (!profile?.skills || profile.skills.length === 0)
        ) {
          updates.skills = updates.skills || [
            "Problem Solving",
            "Team Leadership",
            "Project Management",
            "Communication",
            "Strategic Thinking",
          ];
        }
        if (fieldsToGenerate.includes("tagline") && !profile?.tagline) {
          updates.tagline =
            updates.tagline ||
            `Building practical solutions as a ${profile?.job_title || "professional"}`;
        }
        if (Object.keys(updates).length > 0) {
          await updateProfile(updates);
        }
      }

      await triggerGenerate();
    },
    [profile],
  );

  const triggerGenerate = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    setProgressStep(0);
    setProgressDone(false);

    timeoutRef.current = setTimeout(async () => {
      if (user) await fetchProfile(user.id);
      await loadDeployments();
      setGenerating(false);
      setProgressDone(false);
      setProgressStep(0);
      showToast("Portfolio deployed! Check your deployments below.", "success");
    }, 180000);

    try {
      const { error } = await supabase.functions.invoke(
        "trigger-portfolio-generation",
        { method: "POST" },
      );

      if (error) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        clearProgressInterval();
        setGenerating(false);
        if (error.message?.includes("RATE_LIMIT")) {
          showToast("Max 3 generations per 24 hours reached", "error");
        } else if (error.message?.includes("SUBSCRIPTION")) {
          showToast("Your trial has expired. Please upgrade.", "error");
        } else {
          showToast(error.message || "Generation failed", "error");
        }
      }
    } catch (err: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearProgressInterval();
      setGenerating(false);
      showToast(
        (err as Error).message || "Failed to start generation",
        "error",
      );
    }
  }, [user]);

  const handleShare = useCallback(async () => {
    if (!profile?.portfolio_url) return;
    await Share.share({
      message: `Check out my professional portfolio: ${profile.portfolio_url}`,
      url: profile.portfolio_url,
    });
  }, [profile]);

  const handleOpenPortfolio = useCallback(() => {
    if (profile?.portfolio_url) Linking.openURL(profile.portfolio_url);
  }, [profile]);

  // -- RENDER -----------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <ProfileGapModal
        visible={showGapModal}
        onClose={() => setShowGapModal(false)}
        onProceed={handleProceedWithGeneration}
        profile={profile}
        mode="portfolio"
      />
      <GenerationFeedbackPrompt
        visible={showFeedbackPrompt}
        userId={user?.id}
        feature="portfolio"
        artifactId={lastDeploymentId}
        onClose={() => setShowFeedbackPrompt(false)}
        onSubmitted={() => showToast("Feedback saved.", "success")}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          ref={scrollRef as any}
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* -- Header ---------------------------------------------------- */}
          <View style={styles.header}>
            <View>
              <Text variant="h1">Portfolio</Text>
              <Text
                variant="body"
                color={COLORS.slate}
                style={{ marginTop: 4 }}
              >
                Your professional identity, live on the web
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={styles.refreshBtn}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size={18} color={COLORS.slate} />
              ) : (
                <ArrowClockwise size={20} color={COLORS.slate} weight="bold" />
              )}
            </TouchableOpacity>
          </View>

          {/* -- Generation progress ---------------------------------------- */}
          {generating && (
            <GlassCard
              variant="bordered"
              style={{ marginBottom: 20 }}
              padding={20}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Sparkle size={20} color={COLORS.indigo} weight="fill" />
                <Text
                  variant="label"
                  color={COLORS.snow}
                  style={{ marginLeft: 8 }}
                >
                  Building your portfolio...
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                {PROGRESS_STEPS.map((step, index) => {
                  const isComplete = progressDone ? true : index < progressStep;
                  const isCurrent = !progressDone && index === progressStep;
                  return (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {isComplete ? (
                        <CheckCircle
                          size={18}
                          color={COLORS.emerald}
                          weight="fill"
                        />
                      ) : isCurrent ? (
                        <ActivityIndicator size={16} color={COLORS.indigo} />
                      ) : (
                        <View style={styles.stepDot} />
                      )}
                      <Text
                        variant="caption"
                        color={
                          isComplete
                            ? COLORS.emerald
                            : isCurrent
                              ? COLORS.snow
                              : COLORS.fog
                        }
                        weight={isCurrent ? "semibold" : "regular"}
                      >
                        {step}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {progressDone && (
                <TouchableOpacity
                  onPress={handleOpenPortfolio}
                  style={styles.liveUrlBtn}
                  activeOpacity={0.8}
                >
                  <Globe size={14} color={COLORS.emerald} />
                  <Text
                    variant="caption"
                    color={COLORS.emerald}
                    style={{ marginLeft: 6, textDecorationLine: "underline" }}
                    numberOfLines={1}
                  >
                    {profile?.portfolio_url || "Opening..."}
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          )}

          {/* -- Live portfolio card ---------------------------------------- */}
          {profile?.portfolio_url && !generating && (
            <GlassCard
              variant="elevated"
              style={{ marginBottom: 20 }}
              padding={20}
            >
              <View style={styles.liveCardHeader}>
                <View>
                  <Text variant="h3" style={{ marginBottom: 6 }}>
                    Portfolio Live
                  </Text>
                  <StatusBadge
                    label="Live Live & Deployed"
                    variant="success"
                    dot
                  />
                </View>
                <LinearGradient
                  colors={["rgba(16,185,129,0.2)", "rgba(16,185,129,0.05)"]}
                  style={styles.liveIconGrad}
                >
                  <CheckCircle size={24} color={COLORS.emerald} weight="fill" />
                </LinearGradient>
              </View>

              {/* Portfolio URL chip */}
              <TouchableOpacity
                onPress={handleOpenPortfolio}
                activeOpacity={0.7}
                style={styles.urlChip}
              >
                <Globe size={13} color={COLORS.cyan} />
                <Text
                  variant="mono"
                  numberOfLines={1}
                  style={{
                    color: COLORS.cyan,
                    marginLeft: 7,
                    flex: 1,
                    textDecorationLine: "underline",
                    fontSize: 12,
                  }}
                >
                  {profile.portfolio_url}
                </Text>
                <ArrowSquareOut size={13} color={COLORS.cyan} />
              </TouchableOpacity>

              {/* Open Portfolio button */}
              <TouchableOpacity
                onPress={handleOpenPortfolio}
                style={styles.openPortfolioBtn}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.indigo, "#20B978"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.openPortfolioBtnInner}
                >
                  <Globe size={18} color="#fff" weight="fill" />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: 15,
                      marginLeft: 8,
                    }}
                  >
                    Open Portfolio
                  </Text>
                  <ArrowSquareOut
                    size={15}
                    color="rgba(255,255,255,0.7)"
                    style={{ marginLeft: 6 }}
                  />
                </LinearGradient>
              </TouchableOpacity>

              {/* -- ZIP download - TECH users only ------------------------- */}
              {zipUrl && !isDesignUser && (
                <TouchableOpacity
                  onPress={handleDownloadZip}
                  disabled={zipDownloading}
                  style={[
                    styles.zipDownloadBtn,
                    zipDownloading && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.8}
                >
                  {zipDownloading ? (
                    <ActivityIndicator size={16} color={COLORS.cyan} />
                  ) : (
                    <Folder size={16} color={COLORS.cyan} weight="fill" />
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      variant="label"
                      color={COLORS.snow}
                      style={{ fontSize: 13 }}
                    >
                      Download Project Files
                    </Text>
                    <Text variant="caption" color={COLORS.slate}>
                      ZIP with setup instructions for all projects
                    </Text>
                  </View>
                  <DownloadSimple size={16} color={COLORS.cyan} />
                </TouchableOpacity>
              )}

              {/* ZIP pending - TECH users only, within timeout window */}
              {!zipUrl &&
                latestReadyDeployment &&
                !zipPendingTooLong &&
                !isDesignUser && (
                  <View style={styles.zipPendingRow}>
                    <Warning size={14} color={COLORS.slate} />
                    <Text
                      variant="caption"
                      color={COLORS.slate}
                      style={{ marginLeft: 8, flex: 1 }}
                    >
                      Project files are being prepared. Refresh in a moment to
                      see the download button.
                    </Text>
                  </View>
                )}

              {/* -- Google Drive link - DESIGN users only ------------------ */}
              {isDesignUser && (
                <View style={styles.driveLinkSection}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                    >
                      <View style={styles.driveIcon}>
                      <Text style={{ fontSize: 11 }}>Drive</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="label"
                        color={COLORS.snow}
                        style={{ fontSize: 13 }}
                      >
                        Share Extra Work
                      </Text>
                      <Text variant="caption" color={COLORS.slate}>
                        Add a Google Drive link to showcase more projects
                      </Text>
                    </View>
                  </View>

                  <View style={styles.driveLinkInputRow}>
                    <TextInput
                      style={styles.driveLinkInput}
                      value={driveLinkInput}
                      onChangeText={setDriveLinkInput}
                      placeholder="https://drive.google.com/..."
                      placeholderTextColor={COLORS.fog}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="done"
                      onSubmitEditing={handleSaveDriveLink}
                    />
                    <TouchableOpacity
                      onPress={handleSaveDriveLink}
                      disabled={savingDriveLink || !driveLinkInput.trim()}
                      style={[
                        styles.driveSaveBtn,
                        (savingDriveLink || !driveLinkInput.trim()) && {
                          opacity: 0.45,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      {savingDriveLink ? (
                        <ActivityIndicator size={14} color="#fff" />
                      ) : (
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Save
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {(profile as any)?.design_portfolio_drive_url ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          (profile as any).design_portfolio_drive_url,
                        )
                      }
                      activeOpacity={0.7}
                      style={{ marginTop: 8 }}
                    >
                      <Text
                        variant="caption"
                        color={COLORS.cyan}
                        style={{ textDecorationLine: "underline" }}
                        numberOfLines={1}
                      >
                        Done Saved:{" "}
                        {(profile as any).design_portfolio_drive_url.substring(
                          0,
                          48,
                        )}
                        ...
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {/* Share link */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <ShareNetwork size={16} color={COLORS.slate} />
                <Text
                  variant="caption"
                  color={COLORS.slate}
                  style={{ marginLeft: 8 }}
                >
                  Share Link
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* -- ZIP-only card (edge case - tech only) ---------------------- */}
          {zipUrl &&
            !profile?.portfolio_url &&
            !generating &&
            !isDesignUser && (
              <GlassCard style={{ marginBottom: 20 }} padding={16}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <LinearGradient
                    colors={["rgba(21,154,99,0.2)", "rgba(21,154,99,0.05)"]}
                    style={styles.zipIconGrad}
                  >
                    <Folder size={20} color={COLORS.cyan} weight="fill" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" color={COLORS.snow}>
                      Your Project Files Are Ready
                    </Text>
                    <Text variant="caption" color={COLORS.slate}>
                      Download and follow the setup instructions
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleDownloadZip}
                  disabled={zipDownloading}
                  style={[
                    styles.zipDownloadBtn,
                    zipDownloading && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.8}
                >
                  {zipDownloading ? (
                    <ActivityIndicator size={16} color={COLORS.cyan} />
                  ) : (
                    <DownloadSimple size={16} color={COLORS.cyan} />
                  )}
                  <Text
                    variant="label"
                    color={COLORS.snow}
                    style={{ marginLeft: 8 }}
                  >
                    Download Project ZIP
                  </Text>
                </TouchableOpacity>
              </GlassCard>
            )}

          {/* -- Generate card ---------------------------------------------- */}
          {!generating && (
            <GlassCard style={{ marginBottom: 20 }} padding={20}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <LinearGradient
                  colors={[COLORS.indigo, COLORS.cyan]}
                  style={styles.generateIcon}
                >
                  <Rocket size={20} color="#fff" weight="fill" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text variant="label" color={COLORS.snow}>
                    {profile?.portfolio_url
                      ? "Regenerate Portfolio"
                      : "Generate My Portfolio"}
                  </Text>
                  <Text variant="caption" color={COLORS.slate}>
                    {profile?.portfolio_url
                      ? "Build a fresh version with updated data"
                      : "AI-powered, deployed live in minutes"}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 8, marginBottom: 16 }}>
                {generateBullets.map((item, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CheckCircle
                      size={14}
                      color={COLORS.emerald}
                      weight="fill"
                    />
                    <Text variant="caption" color={COLORS.slate}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                title={
                  profile?.portfolio_url
                    ? "Regenerate Portfolio"
                    : "Generate Portfolio"
                }
                onPress={handleGeneratePress}
                size="lg"
              />
              <Text
                variant="caption"
                color={COLORS.fog}
                align="center"
                style={{ marginTop: 8 }}
              >
                Max 3 generations per 24 hours
              </Text>
            </GlassCard>
          )}

          {/* -- GitHub / Source status card -------------------------------- */}
          {isTechFamily ? (
            profile?.github_username ? (
              <GlassCard padding={14} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <GithubLogo size={20} color={COLORS.snow} weight="fill" />
                  <Text variant="label" color={COLORS.snow}>
                    GitHub Connected
                  </Text>
                  <CheckCircle size={16} color={COLORS.emerald} weight="fill" />
                  <Text
                    variant="mono"
                    style={{ marginLeft: "auto", fontSize: 13 }}
                  >
                    @{profile.github_username}
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <GlassCard padding={14} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Warning size={18} color={COLORS.gold} weight="fill" />
                  <View style={{ flex: 1 }}>
                    <Text variant="label" color={COLORS.snow}>
                      GitHub not connected
                    </Text>
                    <Text variant="caption" color={COLORS.fog}>
                      Connect GitHub in your profile to use real projects
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )
          ) : (
            <GlassCard padding={14} style={{ marginBottom: 20 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Palette size={20} color={COLORS.gold} weight="fill" />
                <View style={{ flex: 1 }}>
                  <Text variant="label" color={COLORS.snow}>
                    Design Portfolio
                  </Text>
                  <Text variant="caption" color={COLORS.fog}>
                    Your projects are beautifully showcased from your profile
                  </Text>
                </View>
                <CheckCircle size={16} color={COLORS.emerald} weight="fill" />
              </View>
            </GlassCard>
          )}

          {/* -- Deployment history ----------------------------------------- */}
          {deployments.length > 0 && (
            <>
              <Text variant="h3" style={{ marginBottom: 12 }}>
                Deployment History
              </Text>
              <View style={{ gap: 8, marginBottom: 40 }}>
                {deployments.map((dep) => {
                  const status = getDeployStatus(dep);
                  const isReady = dep.deploy_status === "READY";
                  const hasZip = isReady && !!dep.zip_url && !isDesignUser;
                  return (
                    <GlassCard key={dep.id} padding={14}>
                      <View style={styles.depRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            variant="caption"
                            color={COLORS.snow}
                            style={{ marginBottom: 4 }}
                          >
                            {formatDeployTime(dep.deployed_at)}
                          </Text>
                          {dep.live_url && isReady && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(dep.live_url)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: COLORS.cyan,
                                  textDecorationLine: "underline",
                                  fontFamily: "monospace",
                                }}
                                numberOfLines={1}
                              >
                                {dep.live_url}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {hasZip && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(dep.zip_url)}
                              style={styles.depZipBtn}
                              activeOpacity={0.7}
                            >
                              <DownloadSimple size={13} color={COLORS.cyan} />
                            </TouchableOpacity>
                          )}
                          {isReady && dep.live_url && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(dep.live_url)}
                              style={styles.depOpenBtn}
                              activeOpacity={0.7}
                            >
                              <ArrowSquareOut size={14} color={COLORS.indigo} />
                            </TouchableOpacity>
                          )}
                          <StatusBadge
                            label={status.label}
                            variant={status.variant}
                            dot
                          />
                        </View>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors, RADIUS: ThemeRadius, SHADOWS: ThemeShadows) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  liveUrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  liveCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  liveIconGrad: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  urlChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(21,154,99,0.08)",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  openPortfolioBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  openPortfolioBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  zipDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.35)",
    backgroundColor: "rgba(21,154,99,0.07)",
    marginBottom: 10,
  },
  zipPendingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    marginBottom: 10,
  },
  zipIconGrad: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  // Drive link styles (design users only)
  driveLinkSection: {
    marginBottom: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.25)",
    backgroundColor: "rgba(21,154,99,0.05)",
  },
  driveIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(21,154,99,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  driveLinkInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  driveLinkInput: {
    flex: 1,
    color: COLORS.snow,
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  driveSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
    justifyContent: "center",
    alignItems: "center",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  generateIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  depRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  depOpenBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(21,154,99,0.12)",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  depZipBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(21,154,99,0.08)",
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
