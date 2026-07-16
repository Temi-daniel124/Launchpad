import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Image,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { Text } from "../../../components/ui/Text";
import { GlassCard } from "../../../components/ui/GlassCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { COLORS, RADIUS, SHADOWS } from "../../../constants/theme";
import {
  Rocket,
  Briefcase,
  FileText,
  Robot,
  Globe,
  ArrowRight,
  Crown,
  CalendarBlank,
  Sparkle,
  CheckCircle,
  ArrowSquareOut,
  TrendUp,
  Lightning,
} from "phosphor-react-native";

const { width } = Dimensions.get("window");

// -----------------------------------------------------------------------------
// AI Career tips , shown daily, rotated by day of year
// -----------------------------------------------------------------------------
const CAREER_TIPS = [
  {
    tip: "Tailor your CV summary to each job description. Mirror the exact language the employer uses , ATS systems score keyword density.",
    category: "CV Strategy",
  },
  {
    tip: "Add quantified results to every achievement. 'Increased conversion rate by 23%' beats 'Improved conversions' every time.",
    category: "CV Impact",
  },
  {
    tip: "Connect with the hiring manager on LinkedIn before applying. A warm introduction increases your callback rate by up to 4x.",
    category: "Networking",
  },
  {
    tip: "The best time to send a job application is Tuesday to Thursday between 10am to 11am , hiring managers are most responsive then.",
    category: "Timing",
  },
  {
    tip: "Research the company's most recent press releases and reference them in your cover letter. It signals genuine interest.",
    category: "Research",
  },
  {
    tip: "For technical roles, a live GitHub portfolio with README files converts 60% better than a list of technologies on a CV.",
    category: "Portfolio",
  },
  {
    tip: "Salary negotiation: always let the employer give the first number. Research the market rate at Levels.fyi, Glassdoor, and LinkedIn Salary.",
    category: "Negotiation",
  },
  {
    tip: "Follow up on every application after 5 business days with a concise, professional email. Most candidates never follow up.",
    category: "Follow-up",
  },
  {
    tip: "Prepare 3 STAR stories (Situation, Task, Action, Result) for behavioural interviews. Practice them until they feel natural.",
    category: "Interviews",
  },
  {
    tip: "Your LinkedIn 'About' section should open with a hook , your biggest career achievement in the first two lines before 'see more'.",
    category: "LinkedIn",
  },
];

function getTodaysTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return CAREER_TIPS[dayOfYear % CAREER_TIPS.length];
}

// -----------------------------------------------------------------------------
// Profile completeness calculator
// -----------------------------------------------------------------------------
function calcProfileCompleteness(profile: any): {
  score: number;
  missing: string[];
} {
  const checks = [
    {
      key: "full_name",
      label: "Full name",
      done: !!profile?.full_name?.trim(),
    },
    {
      key: "job_title",
      label: "Job title",
      done: !!profile?.job_title?.trim(),
    },
    {
      key: "bio",
      label: "Bio",
      done: (profile?.bio?.trim()?.length || 0) > 20,
    },
    {
      key: "skills",
      label: "Skills (3+)",
      done: (profile?.skills?.length || 0) >= 3,
    },
    {
      key: "portfolio_url",
      label: "Portfolio",
      done: !!profile?.portfolio_url,
    },
    {
      key: "github_username",
      label: "GitHub",
      done: !!profile?.github_username?.trim(),
    },
    {
      key: "linkedin_url",
      label: "LinkedIn",
      done: !!profile?.linkedin_url?.trim(),
    },
    {
      key: "experience",
      label: "Work experience",
      done: (profile?.work_experience?.length || 0) >= 1,
    },
    {
      key: "education",
      label: "Education",
      done: (profile?.education?.length || 0) >= 1,
    },
    { key: "location", label: "Location", done: !!profile?.location?.trim() },
  ];
  const done = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return { score: Math.round((done / checks.length) * 100), missing };
}

// -----------------------------------------------------------------------------
// Animated progress bar
// -----------------------------------------------------------------------------
function ProfileCompletenessBar({ score }: { score: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: score,
      useNativeDriver: false,
      speed: 3,
      bounciness: 0,
    }).start();
  }, [score]);

  const barColor =
    score >= 80 ? COLORS.emerald : score >= 50 ? COLORS.indigo : COLORS.gold;

  return (
    <View style={styles.progressBarBg}>
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Animated stat number
// -----------------------------------------------------------------------------
function AnimatedStat({ value, color }: { value: number; color: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeAllListeners();
  }, [value]);

  return (
    <Text
      style={{
        fontSize: 28,
        fontWeight: "800",
        color,
        fontFamily: "ClashDisplay",
      }}
    >
      {display}
    </Text>
  );
}

// -----------------------------------------------------------------------------
// MAIN SCREEN
// -----------------------------------------------------------------------------
export default function HomeScreen() {
  const { profile, fetchProfile, user } = useAuthStore();
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [cvCount, setCvCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const todaysTip = getTodaysTip();
  const { score: completenessScore, missing: missingFields } =
    calcProfileCompleteness(profile);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 3,
      }),
    ]).start();
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [jobsRes, savedRes, cvsRes] = await Promise.all([
        supabase
          .from("user_saved_jobs")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "new")
          .order("saved_at", { ascending: false })
          .limit(3),
        supabase
          .from("user_saved_jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("user_cvs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      setRecentJobs(jobsRes.data || []);
      setJobCount(savedRes.count || 0);
      setCvCount(cvsRes.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchProfile(user.id);
    await loadData();
    setRefreshing(false);
  }, [user]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTrialDaysLeft = () => {
    if (!profile?.trial_ends_at) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000,
      ),
    );
  };

  const daysLeft = getTrialDaysLeft();
  const isTrialActive =
    profile?.subscription_status === "trial" && daysLeft > 0;
  const isExpired = profile?.subscription_status === "expired";
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const QUICK_ACTIONS = [
    {
      icon: Globe,
      label: "Portfolio",
      color: COLORS.indigo,
      bg: "rgba(21,154,99,0.12)",
      route: "/(tabs)/portfolio",
    },
    {
      icon: Briefcase,
      label: "Find Jobs",
      color: COLORS.cyan,
      bg: "rgba(21,154,99,0.12)",
      route: "/(tabs)/jobs",
    },
    {
      icon: FileText,
      label: "Build CV",
      color: COLORS.gold,
      bg: "rgba(245,158,11,0.12)",
      route: "/(tabs)/cv",
    },
    {
      icon: Robot,
      label: "AI Chat",
      color: COLORS.emerald,
      bg: "rgba(16,185,129,0.12)",
      route: "/(tabs)/chat",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(21,154,99,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
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
          {/* -- Header ---------------------------------------------------- */}
          <View style={styles.header}>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.fog,
                  fontFamily: "Outfit-Regular",
                }}
              >
                {getGreeting()},
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: COLORS.snow,
                  marginTop: 2,
                  fontFamily: "ClashDisplay",
                }}
              >
                {firstName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatarBtn}
              activeOpacity={0.85}
            >
              {profile?.profile_photo_url ? (
                <Image
                  source={{ uri: profile.profile_photo_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.indigo, COLORS.cyan]}
                  style={styles.avatarGrad}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}
                  >
                    {profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </LinearGradient>
              )}
              {/* Online indicator */}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>

          {/* -- Trial / Expired banners ------------------------------------ */}
          {isTrialActive && (
            <GlassCard
              variant="bordered"
              style={{ marginBottom: 14 }}
              padding={14}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <CalendarBlank size={18} color={COLORS.gold} weight="duotone" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: COLORS.snow,
                    }}
                  >
                    {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in free trial
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.slate, marginTop: 2 }}
                  >
                    Upgrade to keep all features
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile")}
                  style={styles.upgradeChip}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.gold,
                      fontWeight: "700",
                    }}
                  >
                    Upgrade
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}

          {isExpired && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.9}
            >
              <View style={styles.expiredBanner}>
                <Crown size={18} color={COLORS.rose} weight="duotone" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: COLORS.snow,
                    }}
                  >
                    Trial Expired
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.slate, marginTop: 1 }}
                  >
                    Upgrade to continue using Launchpad
                  </Text>
                </View>
                <ArrowRight size={16} color={COLORS.rose} />
              </View>
            </TouchableOpacity>
          )}

          {/* -- Profile Completeness Card (Bug #9) ------------------------- */}
          <GlassCard style={{ marginBottom: 16 }} padding={18}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={[
                    styles.sectionIconBg,
                    { backgroundColor: "rgba(21,154,99,0.12)" },
                  ]}
                >
                  <TrendUp size={15} color={COLORS.indigo} weight="bold" />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: COLORS.snow,
                  }}
                >
                  Profile Strength
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color:
                      completenessScore >= 80
                        ? COLORS.emerald
                        : completenessScore >= 50
                          ? COLORS.indigo
                          : COLORS.gold,
                    fontFamily: "ClashDisplay",
                  }}
                >
                  {completenessScore}%
                </Text>
              </View>
            </View>

            <ProfileCompletenessBar score={completenessScore} />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 11, color: COLORS.fog }}>
                {completenessScore < 40
                  ? "Weak , add more details"
                  : completenessScore < 70
                    ? "Good , keep going"
                    : "Strong profile"}
              </Text>
              {missingFields.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile/edit" as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.indigo,
                      fontWeight: "600",
                    }}
                  >
                    +{missingFields.length} missing to
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {missingFields.length > 0 && completenessScore < 80 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {missingFields.slice(0, 4).map((field) => (
                  <TouchableOpacity
                    key={field}
                    onPress={() => router.push("/(tabs)/profile/edit" as any)}
                    style={styles.missingFieldChip}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11, color: COLORS.slate }}>
                      + {field}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </GlassCard>

          {/* -- Quick Actions ---------------------------------------------- */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                  style={[
                    styles.quickActionCard,
                    {
                      backgroundColor: action.bg,
                      borderColor: `${action.color}25`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.quickActionIconWrap,
                      { backgroundColor: `${action.color}18` },
                    ]}
                  >
                    <Icon size={22} color={action.color} weight="duotone" />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: COLORS.snow,
                      marginTop: 10,
                      textAlign: "center",
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* -- AI Career Tip of the Day (Bug #9) ------------------------- */}
          <LinearGradient
            colors={["rgba(16,185,129,0.12)", "rgba(16,185,129,0.04)"]}
            style={styles.tipCard}
          >
            <View style={styles.tipCardInner}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <View
                  style={[
                    styles.sectionIconBg,
                    { backgroundColor: "rgba(16,185,129,0.2)" },
                  ]}
                >
                  <Sparkle size={14} color={COLORS.emerald} weight="fill" />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: COLORS.emerald,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Career Insight
                </Text>
                <View style={styles.tipCategoryBadge}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.emerald,
                      fontWeight: "600",
                    }}
                  >
                    {todaysTip.category}
                  </Text>
                </View>
              </View>
              <Text
                style={{ fontSize: 13, color: COLORS.slate, lineHeight: 20 }}
              >
                {todaysTip.tip}
              </Text>
            </View>
          </LinearGradient>

          {/* -- Portfolio Status ------------------------------------------ */}
          <GlassCard style={{ marginBottom: 16 }} padding={18}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={styles.cardTitle}>Portfolio</Text>
              {profile?.portfolio_url ? (
                <StatusBadge label="Live" variant="success" dot />
              ) : (
                <StatusBadge label="Not Generated" variant="default" />
              )}
            </View>

            {profile?.portfolio_url ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/portfolio")}
                activeOpacity={0.8}
              >
                <View style={styles.urlChip}>
                  <Globe size={12} color={COLORS.cyan} />
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.cyan,
                      marginLeft: 6,
                      flex: 1,
                      fontFamily: "JetBrainsMono-Regular",
                    }}
                    numberOfLines={1}
                  >
                    {profile.portfolio_url}
                  </Text>
                  <ArrowSquareOut size={12} color={COLORS.cyan} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/portfolio")}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.indigo, COLORS.indigoLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.generateBtn}
                >
                  <Rocket size={16} color="#fff" weight="fill" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#fff",
                      marginLeft: 8,
                    }}
                  >
                    Generate My Portfolio
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </GlassCard>

          {/* -- Stats Row (Bug #9 , job search count + CV count) ----------- */}
          <GlassCard style={{ marginBottom: 16 }} padding={18}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <View
                style={[
                  styles.sectionIconBg,
                  { backgroundColor: "rgba(21,154,99,0.15)" },
                ]}
              >
                <Lightning size={14} color={COLORS.cyan} weight="bold" />
              </View>
              <Text style={styles.cardTitle}>Your Progress</Text>
            </View>
            <View style={styles.statsRow}>
              {[
                {
                  label: "Jobs Found",
                  value: jobCount,
                  color: COLORS.indigo,
                  onPress: () => router.push("/(tabs)/jobs"),
                },
                {
                  label: "CVs Generated",
                  value: cvCount,
                  color: COLORS.gold,
                  onPress: () => router.push("/(tabs)/cv"),
                },
                {
                  label: "Profile Score",
                  value: completenessScore,
                  color: completenessScore >= 70 ? COLORS.emerald : COLORS.fog,
                  onPress: () => router.push("/(tabs)/profile/edit" as any),
                },
              ].map((stat, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={stat.onPress}
                  activeOpacity={0.7}
                  style={[
                    styles.stat,
                    i < 2 && {
                      borderRightWidth: 1,
                      borderRightColor: COLORS.rim,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={stat.color} />
                  ) : (
                    <AnimatedStat value={stat.value} color={stat.color} />
                  )}
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.fog,
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    {stat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* -- Latest Matches --------------------------------------------- */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Matches</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/jobs")}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.indigo,
                  fontWeight: "600",
                }}
              >
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.skeletonCard}>
              <View
                style={[styles.skeletonLine, { width: "60%", height: 14 }]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  { width: "40%", height: 11, marginTop: 8 },
                ]}
              />
            </View>
          ) : recentJobs.length > 0 ? (
            <View style={{ gap: 10 }}>
              {recentJobs.map((job) => (
                <GlassCard
                  key={job.id}
                  padding={14}
                  style={{ marginBottom: 0 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: COLORS.snow,
                        }}
                        numberOfLines={1}
                      >
                        {job.job_title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.slate,
                          marginTop: 3,
                        }}
                      >
                        {job.company} {job.location ? `- ${job.location}` : ""}
                      </Text>
                    </View>
                    <StatusBadge
                      label={job.source || "Job"}
                      variant={job.source === "LinkedIn" ? "info" : "default"}
                    />
                  </View>
                  {job.salary ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.gold,
                        marginTop: 6,
                        fontWeight: "600",
                      }}
                    >
                      {job.salary}
                    </Text>
                  ) : null}
                </GlassCard>
              ))}
            </View>
          ) : (
            <GlassCard padding={24}>
              <View style={{ alignItems: "center" }}>
                <Briefcase size={32} color={COLORS.fog} weight="thin" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: COLORS.slate,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No job matches yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.fog,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Your daily digest will arrive soon
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/jobs")}
                  style={styles.findJobsBtn}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: COLORS.indigo,
                    }}
                  >
                    Search Now
                  </Text>
                  <ArrowRight
                    size={14}
                    color={COLORS.indigo}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}

          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarBtn: { position: "relative" },
  avatarGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.indigo,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.emerald,
    borderWidth: 2,
    borderColor: COLORS.abyss,
  },
  upgradeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.3)",
    backgroundColor: "rgba(244,63,94,0.07)",
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.rim,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  missingFieldChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.snow,
    marginBottom: 12,
    fontFamily: "ClashDisplay",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionIconBg: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.snow },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  quickActionCard: {
    width: (width - 50) / 2,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  quickActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tipCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    overflow: "hidden",
  },
  tipCardInner: { padding: 16 },
  tipCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
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
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 12,
  },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 4 },
  findJobsBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(21,154,99,0.12)",
    backgroundColor: "rgba(21,154,99,0.12)",
  },
  skeletonCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.rim,
    padding: 16,
    marginBottom: 10,
  },
  skeletonLine: { backgroundColor: COLORS.rim, borderRadius: 4 },
});
