import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Linking,
  RefreshControl,
  Modal,
  ScrollView,
  Clipboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Toast } from "../../../components/ui/Toast";
import { CardSkeleton } from "../../../components/ui/SkeletonLoader";
import { COLORS } from "../../../constants/theme";
import {
  MagnifyingGlass,
  Briefcase,
  MapPin,
  CurrencyDollar,
  ArrowSquareOut,
  BookmarkSimple,
  LinkedinLogo,
  Copy,
  X,
  CaretDown,
  Robot,
  HandPointing,
  Warning,
  ArrowRight,
  Check,
} from "phosphor-react-native";

// ─────────────────────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { color: string }> = {
  LinkedIn: { color: "#0A66C2" },
  RemoteOK: { color: "#00B35B" },
  WeWorkRemotely: { color: "#7C3AED" },
  Glassdoor: { color: "#0CAA41" },
  Indeed: { color: "#003A9B" },
  "Google Jobs": { color: "#EA4335" },
};

const STATUS_OPTIONS = [
  { key: "all", label: "All Jobs" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "auto", label: "Auto Applied" },
];

const SOURCE_OPTIONS = [
  { key: "all", label: "All Sources" },
  { key: "LinkedIn", label: "LinkedIn" },
  { key: "Indeed", label: "Indeed" },
  { key: "Glassdoor", label: "Glassdoor" },
  { key: "Google Jobs", label: "Google Jobs" },
  { key: "RemoteOK", label: "RemoteOK" },
];

const MAX_LI_CHARS = 1800;

function buildLinkedInDM(job: any, profile: any): string {
  const firstName = (profile?.full_name || "there").split(" ")[0];
  const jobTitle = profile?.job_title || "professional";
  const years = profile?.experience_years || 4;
  const industry = profile?.industry || "technology";
  const portfolio = profile?.portfolio_url || "";

  const lines = [
    `Hi [Hiring Manager],`,
    ``,
    `I recently came across the ${job.job_title} position at ${job.company} and wanted to reach out directly, as this role aligns closely with my background and career goals.`,
    ``,
    `I am a ${jobTitle} with ${years}+ years of experience in ${industry}, with a strong track record of delivering measurable outcomes through technical leadership and cross-functional collaboration.`,
    ``,
    portfolio
      ? `I have built a live portfolio of my work at ${portfolio}, which I believe demonstrates the quality and depth of my experience.`
      : `I am passionate about contributing to teams like ${job.company} where impact and quality of work are valued.`,
    ``,
    `I would greatly appreciate a few minutes of your time to learn more about the team and explore how I might contribute. Would you be open to a brief conversation?`,
    ``,
    `Thank you sincerely for your consideration.`,
    ``,
    `Best regards,`,
    firstName,
  ];

  const msg = lines.join("\n");
  return msg.length > MAX_LI_CHARS
    ? msg.substring(0, MAX_LI_CHARS - 3) + "..."
    : msg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact dropdown component
// ─────────────────────────────────────────────────────────────────────────────
function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeOption = options.find((o) => o.key === value);

  return (
    <View style={{ position: "relative", zIndex: open ? 100 : 1 }}>
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterBtnText}>{activeOption?.label ?? label}</Text>
        <CaretDown
          size={12}
          color={COLORS.slate}
          style={{
            marginLeft: 4,
            transform: [{ rotate: open ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.dropdownItem,
                  active && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(opt.key);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    active && { color: COLORS.snow },
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <Check size={12} color={COLORS.indigo} weight="bold" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function JobsScreen() {
  const { user, profile } = useAuthStore();
  const { showToast } = useUIStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [triggeringSearch, setTriggeringSearch] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchQuery, statusFilter, sourceFilter, jobs]);

  const loadJobs = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("user_saved_jobs")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "dismissed")
        .order("saved_at", { ascending: false });
      setJobs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let result = [...jobs];

    if (statusFilter === "new")
      result = result.filter((j) => j.status === "new");
    else if (statusFilter === "saved")
      result = result.filter((j) => j.status === "viewed");
    else if (statusFilter === "applied")
      result = result.filter((j) => j.status === "applied" && !j.auto_applied);
    else if (statusFilter === "auto")
      result = result.filter(
        (j) => j.auto_applied || j.apply_method === "auto",
      );

    if (sourceFilter !== "all")
      result = result.filter((j) => j.source === sourceFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.job_title?.toLowerCase().includes(q) ||
          j.company?.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q),
      );
    }

    setFiltered(result);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleTriggerSearch = async () => {
    if (!user) return;
    setTriggeringSearch(true);
    try {
      const { error } = await supabase.functions.invoke("trigger-job-search", {
        method: "POST",
      });
      if (error) showToast(error.message || "Search failed", "error");
      else {
        showToast("Search triggered. Results arriving shortly.", "success");
        setTimeout(() => loadJobs(), 10000);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Search failed", "error");
    } finally {
      setTriggeringSearch(false);
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    await supabase.from("user_saved_jobs").update({ status }).eq("id", jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
  };

  const handleApplyNow = (job: any) => {
    if (!job.link) return showToast("No application link available", "error");
    Linking.openURL(job.link);
    supabase
      .from("user_saved_jobs")
      .update({
        status: "applied",
        apply_method: "manual",
        applied_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? { ...j, status: "applied", apply_method: "manual" }
          : j,
      ),
    );
    setSelectedJob(null);
  };

  const handleCopyDM = (job: any) => {
    Clipboard.setString(buildLinkedInDM(job, profile));
    showToast("Message copied to clipboard", "success");
  };

  // ── Job card ──────────────────────────────────────────────────────────────
  const renderJobCard = ({ item: job }: { item: any }) => {
    const src = SOURCE_CONFIG[job.source] || { color: COLORS.indigo };
    const isNew = job.status === "new";
    const isAuto = job.auto_applied || job.apply_method === "auto";
    const isManual = job.apply_method === "manual" && !isAuto;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedJob(job);
          updateJobStatus(job.id, "viewed");
        }}
        activeOpacity={0.8}
        style={{ marginBottom: 10 }}
      >
        <GlassCard padding={16}>
          {isNew && <View style={styles.newDot} />}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text variant="label" color={COLORS.snow} numberOfLines={2}>
                {job.job_title}
              </Text>
              <Text
                variant="caption"
                color={COLORS.slate}
                style={{ marginTop: 3 }}
              >
                {job.company}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <View
                style={[
                  styles.srcBadge,
                  {
                    backgroundColor: `${src.color}18`,
                    borderColor: `${src.color}40`,
                  },
                ]}
              >
                <Text
                  style={{ color: src.color, fontSize: 10, fontWeight: "700" }}
                >
                  {job.source}
                </Text>
              </View>
              {isAuto && (
                <View style={styles.autoBadge}>
                  <Robot size={10} color={COLORS.cyan} weight="fill" />
                  <Text
                    style={{
                      color: COLORS.cyan,
                      fontSize: 9,
                      fontWeight: "700",
                      marginLeft: 3,
                    }}
                  >
                    Auto
                  </Text>
                </View>
              )}
              {isManual && (
                <View style={styles.manualBadge}>
                  <HandPointing size={10} color={COLORS.gold} weight="fill" />
                  <Text
                    style={{
                      color: COLORS.gold,
                      fontSize: 9,
                      fontWeight: "700",
                      marginLeft: 3,
                    }}
                  >
                    Manual
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {job.location && (
              <View style={styles.metaRow}>
                <MapPin size={12} color={COLORS.fog} />
                <Text
                  variant="caption"
                  color={COLORS.fog}
                  style={{ marginLeft: 4 }}
                >
                  {job.location}
                </Text>
              </View>
            )}
            {job.salary && (
              <View style={styles.metaRow}>
                <CurrencyDollar size={12} color={COLORS.gold} />
                <Text
                  variant="caption"
                  color={COLORS.gold}
                  style={{ marginLeft: 4 }}
                >
                  {job.salary}
                </Text>
              </View>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // ── LinkedIn DM section (LinkedIn jobs only) ────────────────────────────
  const LinkedInDMSection = ({ job }: { job: any }) => {
    const isLinkedIn = job.source === "LinkedIn";

    // Non-LinkedIn sources: show a clean "Apply Directly" card instead
    if (!isLinkedIn) {
      return (
        <GlassCard variant="bordered" style={{ marginBottom: 20 }} padding={18}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <ArrowSquareOut size={18} color={COLORS.indigo} weight="fill" />
            <View>
              <Text variant="label" color={COLORS.snow}>
                Apply Directly
              </Text>
              <Text
                variant="caption"
                color={COLORS.slate}
                style={{ marginTop: 1 }}
              >
                Visit the listing and submit your application
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.indigo,
              borderRadius: 10,
              paddingVertical: 13,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
            onPress={() => {
              if (job.link) Linking.openURL(job.link);
            }}
            activeOpacity={0.8}
            disabled={!job.link}
          >
            <ArrowSquareOut size={15} color="#fff" weight="bold" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              Open Job Listing
            </Text>
          </TouchableOpacity>
        </GlassCard>
      );
    }

    // LinkedIn jobs: show the full outreach DM
    const dm = buildLinkedInDM(job, profile);
    const chars = dm.length;
    const charColor =
      chars > 1700 ? COLORS.rose : chars > 1400 ? COLORS.gold : COLORS.emerald;
    return (
      <GlassCard variant="bordered" style={{ marginBottom: 20 }} padding={18}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LinkedinLogo size={18} color="#0A66C2" weight="fill" />
            <View>
              <Text variant="label" color={COLORS.snow}>
                LinkedIn Outreach Message
              </Text>
              <Text
                variant="caption"
                color={COLORS.slate}
                style={{ marginTop: 1 }}
              >
                Crafted for this specific role
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: charColor, fontWeight: "700" }}>
              {chars}/{MAX_LI_CHARS}
            </Text>
            <Text variant="caption" color={COLORS.fog} style={{ fontSize: 10 }}>
              characters
            </Text>
          </View>
        </View>
        <View style={styles.dmBox}>
          <Text variant="body" color={COLORS.slate} style={{ lineHeight: 22 }}>
            {dm}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            style={[styles.dmBtn, { flex: 1 }]}
            onPress={() => handleCopyDM(job)}
            activeOpacity={0.7}
          >
            <Copy size={14} color={COLORS.indigo} />
            <Text
              style={{
                color: COLORS.indigo,
                fontSize: 12,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              Copy Message
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dmBtn,
              {
                flex: 1,
                borderColor: "#0A66C240",
                backgroundColor: "#0A66C215",
              },
            ]}
            onPress={() => {
              // If JobSpy gave us a direct LinkedIn job URL, use it
              if (job.link && job.link.includes("linkedin.com")) {
                Linking.openURL(job.link);
                return;
              }
              // For LinkedIn jobs: search LinkedIn Jobs by title + company
              if (job.source === "LinkedIn") {
                const query = encodeURIComponent(`${job.title} ${job.company}`);
                Linking.openURL(
                  `https://www.linkedin.com/jobs/search/?keywords=${query}`,
                );
                return;
              }
              // For non-LinkedIn sources: open company page on LinkedIn
              Linking.openURL(
                `https://www.linkedin.com/company/${encodeURIComponent(job.company)}`,
              );
            }}
            activeOpacity={0.7}
          >
            <ArrowRight size={14} color="#0A66C2" />
            <Text
              style={{
                color: "#0A66C2",
                fontSize: 12,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              Find on LinkedIn
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.instructionBox}>
          <Warning
            size={14}
            color={COLORS.gold}
            weight="fill"
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={{
                color: COLORS.gold,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              How to send on LinkedIn
            </Text>
            <Text style={{ color: COLORS.slate, fontSize: 12, lineHeight: 19 }}>
              1. Tap "Find on LinkedIn" above to search for the hiring manager
              at {job.company}
              {"\n"}
              2. Open their profile and tap "Message"{"\n"}
              3. Select topic:{" "}
              <Text style={{ color: COLORS.snow, fontWeight: "700" }}>
                Careers
              </Text>
              {"\n"}
              4. Paste the copied message and send{"\n"}
              {"\n"}
              <Text
                style={{ color: COLORS.fog, fontStyle: "italic", fontSize: 11 }}
              >
                LinkedIn InMail limit: 1,900 characters. Connection note limit:
                300 characters. This message is optimised for InMail.
              </Text>
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(6,182,212,0.07)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text variant="h1">Jobs</Text>
              <Text
                variant="caption"
                color={COLORS.slate}
                style={{ marginTop: 2 }}
              >
                {filtered.length}{" "}
                {filtered.length === 1 ? "opportunity" : "opportunities"}
              </Text>
            </View>
            <Button
              title={triggeringSearch ? "Searching..." : "Search Now"}
              onPress={handleTriggerSearch}
              loading={triggeringSearch}
              variant="ghost"
              size="sm"
              fullWidth={false}
            />
          </View>

          {/* Search + filters in one compact row */}
          <View style={styles.controlsRow}>
            {/* Search input */}
            <View style={styles.searchBox}>
              <MagnifyingGlass
                size={15}
                color={COLORS.fog}
                style={{ marginRight: 8, flexShrink: 0 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search jobs..."
                placeholderTextColor={COLORS.fog}
                value={searchQuery}
                onChangeText={setSearchQuery}
                selectionColor={COLORS.indigo}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color={COLORS.fog} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter dropdowns */}
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onSelect={setStatusFilter}
            />
            <FilterDropdown
              label="Source"
              value={sourceFilter}
              options={SOURCE_OPTIONS}
              onSelect={setSourceFilter}
            />
          </View>

          {/* Jobs list */}
          {loading ? (
            <View style={{ paddingHorizontal: 20 }}>
              {[0, 1, 2].map((i) => (
                <GlassCard key={i} style={{ marginBottom: 10 }}>
                  <CardSkeleton />
                </GlassCard>
              ))}
            </View>
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderJobCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.indigo}
                  colors={[COLORS.indigo]}
                />
              }
              ListEmptyComponent={
                <GlassCard padding={40} style={{ margin: 20 }}>
                  <View style={{ alignItems: "center" }}>
                    <Briefcase size={48} color={COLORS.fog} weight="thin" />
                    <Text
                      variant="label"
                      color={COLORS.slate}
                      style={{ marginTop: 16, textAlign: "center" }}
                    >
                      {statusFilter !== "all" || sourceFilter !== "all"
                        ? "No jobs match your filters"
                        : "No jobs found"}
                    </Text>
                    <Text
                      variant="caption"
                      align="center"
                      style={{ marginTop: 6 }}
                    >
                      {statusFilter !== "all" || sourceFilter !== "all"
                        ? "Try adjusting your filters."
                        : `Tap "Search Now" to trigger a fresh job search.`}
                    </Text>
                  </View>
                </GlassCard>
              }
            />
          )}
        </Animated.View>
      </SafeAreaView>

      {/* Job Detail Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedJob(null)}
      >
        {selectedJob && (
          <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
            <LinearGradient
              colors={["rgba(79,70,229,0.08)", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ padding: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Modal header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text variant="h2" style={{ marginBottom: 4 }}>
                      {selectedJob.job_title}
                    </Text>
                    <Text variant="body" color={COLORS.snow}>
                      {selectedJob.company}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedJob(null)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={COLORS.slate} />
                  </TouchableOpacity>
                </View>

                {/* Meta badges */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 20,
                    marginTop: 12,
                  }}
                >
                  {(() => {
                    const src = SOURCE_CONFIG[selectedJob.source] || {
                      color: COLORS.indigo,
                    };
                    return (
                      <View
                        style={[
                          styles.metaBadge,
                          {
                            backgroundColor: `${src.color}15`,
                            borderColor: `${src.color}40`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: src.color,
                            fontWeight: "600",
                          }}
                        >
                          {selectedJob.source}
                        </Text>
                      </View>
                    );
                  })()}
                  {selectedJob.location && (
                    <View style={styles.metaBadge}>
                      <MapPin size={12} color={COLORS.slate} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.slate,
                          marginLeft: 4,
                        }}
                      >
                        {selectedJob.location}
                      </Text>
                    </View>
                  )}
                  {selectedJob.salary && (
                    <View
                      style={[
                        styles.metaBadge,
                        {
                          backgroundColor: "rgba(245,158,11,0.1)",
                          borderColor: "rgba(245,158,11,0.3)",
                        },
                      ]}
                    >
                      <CurrencyDollar size={12} color={COLORS.gold} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.gold,
                          marginLeft: 4,
                        }}
                      >
                        {selectedJob.salary}
                      </Text>
                    </View>
                  )}
                  {(selectedJob.auto_applied ||
                    selectedJob.apply_method === "auto") && (
                    <View
                      style={[
                        styles.metaBadge,
                        {
                          backgroundColor: "rgba(6,182,212,0.1)",
                          borderColor: "rgba(6,182,212,0.3)",
                        },
                      ]}
                    >
                      <Robot size={12} color={COLORS.cyan} weight="fill" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.cyan,
                          marginLeft: 4,
                        }}
                      >
                        Auto Applied
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                {selectedJob.description && (
                  <GlassCard style={{ marginBottom: 20 }} padding={16}>
                    <Text
                      variant="caption"
                      color={COLORS.fog}
                      style={{
                        marginBottom: 8,
                        fontSize: 11,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      About the Role
                    </Text>
                    <Text
                      variant="body"
                      color={COLORS.slate}
                      style={{ lineHeight: 22 }}
                    >
                      {selectedJob.description}
                    </Text>
                  </GlassCard>
                )}

                {/* LinkedIn DM */}
                <LinkedInDMSection job={selectedJob} />

                {/* Actions */}
                <View style={{ gap: 12 }}>
                  <Button
                    title={
                      selectedJob.link ? "Apply Now" : "No Application Link"
                    }
                    onPress={() => handleApplyNow(selectedJob)}
                    size="lg"
                    disabled={!selectedJob.link}
                    icon={
                      selectedJob.link ? (
                        <ArrowSquareOut size={16} color="#fff" />
                      ) : undefined
                    }
                    iconPosition="right"
                  />
                  <Button
                    title="Save Job"
                    onPress={() => {
                      updateJobStatus(selectedJob.id, "viewed");
                      showToast("Job saved", "success");
                      setSelectedJob(null);
                    }}
                    variant="secondary"
                    size="lg"
                    icon={<BookmarkSimple size={16} color={COLORS.indigo} />}
                    iconPosition="right"
                  />
                  <Button
                    title="Dismiss"
                    onPress={() => {
                      updateJobStatus(selectedJob.id, "dismissed");
                      setSelectedJob(null);
                    }}
                    variant="ghost"
                    size="lg"
                  />
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  // Single compact row: search + 2 dropdowns
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
    height: 40,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.snow,
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    height: "100%",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
    height: 40,
    paddingHorizontal: 12,
  },
  filterBtnText: {
    color: COLORS.slate,
    fontSize: 12,
    fontWeight: "500",
  },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.rim,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
  },
  dropdownItemActive: {
    backgroundColor: "rgba(79,70,229,0.12)",
  },
  dropdownItemText: {
    color: COLORS.slate,
    fontSize: 13,
  },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  srcBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  autoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(6,182,212,0.1)",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.3)",
  },
  manualBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  newDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.indigo,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.rim,
    backgroundColor: COLORS.navy,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  dmBox: {
    backgroundColor: "rgba(248,250,252,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.rim,
    padding: 14,
  },
  dmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.35)",
    backgroundColor: "rgba(79,70,229,0.08)",
  },
  instructionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    padding: 14,
  },
});
