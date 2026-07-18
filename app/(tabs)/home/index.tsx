import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  Briefcase,
  CalendarBlank,
  Crown,
  FileText,
  Globe,
  Robot,
} from "phosphor-react-native";
import { Skeleton } from "../../../components/ui/SkeletonLoader";
import { Text } from "../../../components/ui/Text";
import { Toast } from "../../../components/ui/Toast";
import { useTheme, type ThemeColors, type ThemeRadius, type ThemeShadows } from "../../../contexts/ThemeContext";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";

const CAREER_TIPS = [
  {
    tip: "Tailor your CV summary to each job description. Mirror the exact language the employer uses so your application is easier to match.",
    category: "CV strategy",
  },
  {
    tip: "Add measured results to each achievement. Specific numbers make your work easier for a hiring manager to understand.",
    category: "CV impact",
  },
  {
    tip: "Follow up on applications after five business days with a concise note. Most candidates never do this.",
    category: "Follow up",
  },
  {
    tip: "Before an interview, prepare three short examples that explain the situation, your action, and the result.",
    category: "Interviews",
  },
  {
    tip: "Keep your portfolio focused on your strongest work. A few clear projects usually beat a long, uneven list.",
    category: "Portfolio",
  },
];

const LOADING_STEPS = [
  "Loading your profile",
  "Checking saved jobs",
  "Checking CV activity",
];

type ProfileCheck = {
  label: string;
  done: boolean;
};

type ProfileCompleteness = {
  score: number;
  missing: string[];
};

type ActionItem = {
  label: string;
  description: string;
  route: string;
  Icon: typeof Globe;
};

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTodaysTip() {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86400000);

  return CAREER_TIPS[dayOfYear % CAREER_TIPS.length];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTrialDaysLeft(trialEndsAt?: string | null) {
  if (!trialEndsAt) return 0;

  return Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000),
  );
}

function formatCount(value: number) {
  if (value > 999) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function calcProfileCompleteness(profile: any): ProfileCompleteness {
  const checks: ProfileCheck[] = [
    { label: "full name", done: !!profile?.full_name?.trim() },
    { label: "job title", done: !!profile?.job_title?.trim() },
    { label: "bio", done: (profile?.bio?.trim()?.length || 0) > 20 },
    { label: "three skills", done: (profile?.skills?.length || 0) >= 3 },
    { label: "portfolio", done: !!profile?.portfolio_url },
    { label: "GitHub", done: !!profile?.github_username?.trim() },
    { label: "LinkedIn", done: !!profile?.linkedin_url?.trim() },
    { label: "career goal", done: (profile?.goals?.length || 0) > 0 },
    { label: "industry", done: !!profile?.industry?.trim() },
    { label: "experience level", done: !!profile?.experience_level?.trim() },
  ];
  const completed = checks.filter((check) => check.done).length;
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    score: Math.round((completed / checks.length) * 100),
    missing,
  };
}

function HomeLoadingState({ activeStep }: { activeStep: number }) {
  const { colors: COLORS, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = useMemo(
    () => createStyles(COLORS, RADIUS, SHADOWS),
    [COLORS, RADIUS, SHADOWS],
  );

  return (
    <LinearGradient colors={[COLORS.navy, COLORS.abyss]} style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.loadingHeader}>
            <View>
              <Skeleton width={96} height={16} />
              <Skeleton width={144} height={28} style={styles.loadingTitle} />
            </View>
            <Skeleton width={48} height={48} borderRadius={24} />
          </View>

          <View style={styles.loadingCard}>
            <Text variant="label" color={COLORS.snow}>
              Preparing your home screen
            </Text>
            <Text variant="body" color={COLORS.slate} style={styles.loadingCopy}>
              {LOADING_STEPS[activeStep] ?? LOADING_STEPS[LOADING_STEPS.length - 1]}
            </Text>
            <View style={styles.loadingSteps}>
              {LOADING_STEPS.map((step, index) => (
                <View key={step} style={styles.loadingStep}>
                  <View
                    style={[
                      styles.loadingStepDot,
                      index <= activeStep && styles.loadingStepDotActive,
                    ]}
                  />
                  <Text
                    variant="caption"
                    color={index <= activeStep ? COLORS.snow : COLORS.fog}
                    style={styles.loadingStepText}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.loadingCard}>
            <Skeleton height={20} width="56%" />
            <Skeleton height={12} width="88%" style={styles.loadingLine} />
            <Skeleton height={12} width="72%" style={styles.loadingLine} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const { colors: COLORS, theme, radius: RADIUS, shadows: SHADOWS } = useTheme();
  const styles = useMemo(
    () => createStyles(COLORS, RADIUS, SHADOWS),
    [COLORS, RADIUS, SHADOWS],
  );
  const { width: windowWidth } = useWindowDimensions();
  const { profile, fetchProfile, user, isLoading: authLoading } = useAuthStore();
  const [jobCount, setJobCount] = useState(0);
  const [cvCount, setCvCount] = useState(0);
  const [homeLoading, setHomeLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLoadStep, setActiveLoadStep] = useState(0);

  const firstName = profile?.full_name?.trim()?.split(" ")[0] || "there";
  const initials = profile?.full_name?.trim()?.[0]?.toUpperCase() || "U";
  const todaysTip = useMemo(() => getTodaysTip(), []);
  const completeness = useMemo(() => calcProfileCompleteness(profile), [profile]);
  const nextMissingField = completeness.missing[0];
  const daysLeft = getTrialDaysLeft(profile?.trial_ends_at);
  const isTrialActive = profile?.subscription_status === "trial" && daysLeft > 0;
  const isTrialExpiringSoon = isTrialActive && daysLeft <= 3;
  const isExpired = profile?.subscription_status === "expired" || (
    profile?.subscription_status === "trial" &&
    !!profile?.trial_ends_at &&
    daysLeft === 0
  );
  const activityMax = Math.max(jobCount, cvCount, 1);
  const isPhoneWidth = windowWidth < 768;
  const actionCardWidth = (windowWidth - 48 - 12) / 2;
  const isDarkTheme = theme === "dark";
  const accentSoft = withAlpha(COLORS.indigo, isDarkTheme ? 0.18 : 0.1);
  const accentBorder = withAlpha(COLORS.indigo, isDarkTheme ? 0.34 : 0.2);

  const actions: ActionItem[] = [
    {
      label: "Portfolio",
      description: profile?.portfolio_url ? "Review your live page" : "Build your public page",
      route: "/(tabs)/portfolio",
      Icon: Globe,
    },
    {
      label: "Jobs",
      description: "Review saved matches",
      route: "/(tabs)/jobs",
      Icon: Briefcase,
    },
    {
      label: "CV",
      description: cvCount > 0 ? "Open your latest CV" : "Create a focused CV",
      route: "/(tabs)/cv",
      Icon: FileText,
    },
    {
      label: "Alex chat",
      description: "Get career help",
      route: "/(tabs)/chat",
      Icon: Robot,
    },
  ];

  const loadData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setHomeLoading(true);
        setActiveLoadStep(0);
      }
      setLoadError(null);

      if (!user) {
        setJobCount(0);
        setCvCount(0);
        setHasLoaded(true);
        if (!silent) setHomeLoading(false);
        return;
      }

      try {
        const [savedJobsResult, cvsResult] = await Promise.all([
          supabase
            .from("user_saved_jobs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("user_cvs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (savedJobsResult.error || cvsResult.error) {
          throw new Error("Home activity could not be loaded.");
        }

        setJobCount(savedJobsResult.count || 0);
        setCvCount(cvsResult.count || 0);
      } catch (error) {
        console.warn("Home data load failed.", error);
        setLoadError(
          "We couldn't refresh your home screen. Your connection or the database request did not finish. Pull down to try again in a moment.",
        );
      } finally {
        setHasLoaded(true);
        if (!silent) setHomeLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  useEffect(() => {
    if (!authLoading && !homeLoading) return;

    const timer = setInterval(() => {
      setActiveLoadStep((step) => Math.min(step + 1, LOADING_STEPS.length - 1));
    }, 900);

    return () => clearInterval(timer);
  }, [authLoading, homeLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);

    try {
      if (user) await fetchProfile(user.id);
      await loadData({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, loadData, user]);

  if (authLoading || homeLoading || !hasLoaded) {
    return <HomeLoadingState activeStep={activeLoadStep} />;
  }

  return (
    <LinearGradient colors={[COLORS.navy, COLORS.abyss]} style={styles.screen}>
      <Toast />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.indigo}
              colors={[COLORS.indigo]}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="caption" color={COLORS.slate}>
                {getGreeting()},
              </Text>
              <Text variant="h2" color={COLORS.snow} numberOfLines={1}>
                {firstName}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatarButton}
            >
              {profile?.profile_photo_url ? (
                <Image
                  source={{ uri: profile.profile_photo_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text variant="label" color={COLORS.white}>
                    {initials}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {refreshing ? (
            <View style={styles.refreshNotice}>
              <Text variant="caption" color={COLORS.slate}>
                Refreshing your profile, saved jobs, and CV activity.
              </Text>
            </View>
          ) : null}

          {loadError ? (
            <View style={styles.errorCard}>
              <Text variant="label" color={COLORS.snow}>
                Home did not refresh
              </Text>
              <Text variant="body" color={COLORS.slate} style={styles.errorCopy}>
                {loadError}
              </Text>
              <TouchableOpacity activeOpacity={0.82} onPress={onRefresh} style={styles.secondaryButton}>
                <Text variant="label" color={COLORS.indigo}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isTrialActive ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push("/(tabs)/profile")}
              style={[
                styles.inlineBanner,
                { backgroundColor: accentSoft, borderColor: accentBorder },
              ]}
            >
              <CalendarBlank size={20} color={COLORS.indigo} weight="regular" />
              <View style={styles.bannerText}>
                <Text variant="label" color={COLORS.snow}>
                  {isTrialExpiringSoon
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial`
                    : `Trial active, ${daysLeft} days left`}
                </Text>
                <Text variant="caption" color={COLORS.slate}>
                  Manage your plan from Profile when you are ready.
                </Text>
              </View>
              <ArrowRight size={18} color={COLORS.indigo} />
            </TouchableOpacity>
          ) : null}

          {isExpired ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.expiredBanner}
            >
              <Crown size={20} color={COLORS.rose} weight="regular" />
              <View style={styles.bannerText}>
                <Text variant="label" color={COLORS.snow}>
                  Trial expired
                </Text>
                <Text variant="caption" color={COLORS.slate}>
                  Upgrade from Profile to continue using Launchpad.
                </Text>
              </View>
              <ArrowRight size={18} color={COLORS.rose} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text variant="caption" color={COLORS.slate}>
                  Profile completeness
                </Text>
                <Text variant="h3" color={COLORS.snow}>
                  {completeness.score === 100
                    ? "Your profile is complete"
                    : nextMissingField
                      ? `Finish your ${nextMissingField}`
                      : "Keep your profile current"}
                </Text>
              </View>
              <View style={styles.scorePill}>
                <Text variant="label" color={COLORS.indigo}>
                  {completeness.score}%
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completeness.score}%` },
                ]}
              />
            </View>

            <Text variant="body" color={COLORS.slate} style={styles.profileCopy}>
              {completeness.score === 100
                ? "You have enough detail for portfolio, CV, and job matching workflows."
                : "A more complete profile gives Launchpad better material for your portfolio, CV, and job matches."}
            </Text>

            {completeness.score < 100 ? (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => router.push("/(tabs)/profile/edit" as any)}
                style={styles.primaryButton}
              >
                <Text variant="label" color={COLORS.white}>
                  Finish profile
                </Text>
                <ArrowRight size={18} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text variant="h3" color={COLORS.snow}>
              What do you want to do next?
            </Text>
            <View style={styles.actionGrid}>
              {actions.map((action) => {
                const Icon = action.Icon;

                return (
                  <TouchableOpacity
                    key={action.label}
                    activeOpacity={0.86}
                    onPress={() => router.push(action.route as any)}
                    style={[
                      styles.actionCard,
                      isPhoneWidth && styles.actionCardPhone,
                      { width: actionCardWidth },
                    ]}
                  >
                    <View style={styles.actionIcon}>
                      <Icon size={24} color={COLORS.indigo} weight="regular" />
                    </View>
                    <View style={styles.actionText}>
                      <Text variant="label" color={COLORS.snow}>
                        {action.label}
                      </Text>
                      <Text variant="caption" color={COLORS.slate}>
                        {action.description}
                      </Text>
                    </View>
                    {isPhoneWidth ? null : (
                      <ArrowRight size={18} color={COLORS.fog} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text variant="caption" color={COLORS.slate}>
                  Activity snapshot
                </Text>
                <Text variant="h3" color={COLORS.snow}>
                  Current totals
                </Text>
              </View>
            </View>

            <Text variant="body" color={COLORS.slate} style={styles.activityNote}>
              Trend history is not tracked yet, so this shows your current saved jobs and CVs.
            </Text>

            {[
              { label: "Saved jobs", value: jobCount, route: "/(tabs)/jobs" },
              { label: "Generated CVs", value: cvCount, route: "/(tabs)/cv" },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.86}
                onPress={() => router.push(item.route as any)}
                style={styles.activityRow}
              >
                <View style={styles.activityMeta}>
                  <Text variant="label" color={COLORS.snow}>
                    {item.label}
                  </Text>
                  <Text variant="h2" color={COLORS.snow}>
                    {formatCount(item.value)}
                  </Text>
                </View>
                <View style={styles.activityBarTrack}>
                  <View
                    style={[
                      styles.activityBarFill,
                      { width: `${Math.round((item.value / activityMax) * 100)}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tipCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text variant="caption" color={COLORS.slate}>
                  Career insight
                </Text>
                <Text variant="h3" color={COLORS.snow}>
                  {todaysTip.category}
                </Text>
              </View>
            </View>
            <Text variant="body" color={COLORS.slate} style={styles.tipCopy}>
              {todaysTip.tip}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  RADIUS: ThemeRadius,
  SHADOWS: ThemeShadows,
) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 24 * 5,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  avatarButton: {
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: COLORS.indigo,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarImage: {
    height: 48,
    width: 48,
  },
  refreshNotice: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  inlineBanner: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    padding: 16,
  },
  expiredBanner: {
    alignItems: "center",
    backgroundColor: withAlpha(COLORS.rose, 0.08),
    borderColor: withAlpha(COLORS.rose, 0.32),
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    padding: 16,
  },
  bannerText: {
    flex: 1,
    gap: 4,
  },
  errorCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
    ...SHADOWS.card,
  },
  errorCopy: {
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 24,
    padding: 24,
    ...SHADOWS.card,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  scorePill: {
    backgroundColor: withAlpha(COLORS.indigo, 0.1),
    borderColor: withAlpha(COLORS.indigo, 0.2),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressTrack: {
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.full,
    height: 8,
    marginTop: 24,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: COLORS.indigo,
    borderRadius: RADIUS.full,
    height: 8,
  },
  profileCopy: {
    marginTop: 16,
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.indigo,
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: withAlpha(COLORS.indigo, 0.24),
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    gap: 16,
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 96,
    padding: 16,
    ...SHADOWS.card,
  },
  actionCardPhone: {
    alignItems: "flex-start",
    flexDirection: "column",
    minHeight: 132,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(COLORS.indigo, 0.1),
    borderRadius: RADIUS.xl,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionText: {
    flex: 1,
    gap: 4,
  },
  activityCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: 16,
    marginBottom: 24,
    padding: 24,
    ...SHADOWS.card,
  },
  activityNote: {
    marginTop: 4,
  },
  activityRow: {
    gap: 12,
  },
  activityMeta: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activityBarTrack: {
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.full,
    height: 8,
    overflow: "hidden",
  },
  activityBarFill: {
    backgroundColor: COLORS.indigo,
    borderRadius: RADIUS.full,
    height: 8,
  },
  tipCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 24,
    padding: 24,
    ...SHADOWS.card,
  },
  tipCopy: {
    marginTop: 16,
  },
  loadingHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  loadingTitle: {
    marginTop: 8,
  },
  loadingCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.rim,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
    ...SHADOWS.card,
  },
  loadingCopy: {
    marginTop: 8,
  },
  loadingSteps: {
    gap: 12,
    marginTop: 24,
  },
  loadingStep: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  loadingStepDot: {
    borderColor: COLORS.rim,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  loadingStepDotActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  loadingStepText: {
    flex: 1,
  },
  loadingLine: {
    marginTop: 12,
  },
});
