import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Toast } from "../../../components/ui/Toast";
import { COLORS } from "../../../constants/theme";
import {
  ArrowLeft,
  Plus,
  Trash,
  CaretDown,
  CaretUp,
  Sparkle,
  FloppyDisk,
  User,
  Briefcase,
  GraduationCap,
  Lightning,
  ChatTeardrop,
  Certificate,
  Link,
  Info,
  Palette,
} from "phosphor-react-native";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface WorkExp {
  id: string;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  achievements: string[];
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  field: string;
  start_year: string;
  graduation_year: string;
  grade: string;
}

interface Language {
  id: string;
  language: string;
  cefr: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string;
  author_company: string;
  quote_text: string;
  display_permission_confirmed: boolean;
}

interface SkillsStructured {
  technical: string[];
  soft: string[];
  tools: string[];
}

const CEFR_LEVELS = ["Native", "C2", "C1", "B2", "B1", "A2", "A1"];

const uid = () => Math.random().toString(36).slice(2, 9);
const TESTIMONIALS_UNAVAILABLE_ERROR = "TESTIMONIALS_UNAVAILABLE";
const TESTIMONIALS_LOAD_MESSAGE =
  "We couldn't load your testimonials. The testimonials area could not be reached safely. Try again in a few minutes before editing testimonials.";
const TESTIMONIALS_STILL_LOADING_MESSAGE =
  "Testimonials are still loading. Wait a moment, then try again.";

function getProfileSaveErrorMessage(
  error: unknown,
  profileDetailsSaved: boolean,
) {
  const message =
    error instanceof Error ? error.message : String((error as any)?.message || "");
  const lowerMessage = message.toLowerCase();
  const isTestimonialsFailure =
    message === TESTIMONIALS_UNAVAILABLE_ERROR ||
    lowerMessage.includes("portfolio_testimonials") ||
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("relation") ||
    lowerMessage.includes("display_permission");

  if (isTestimonialsFailure) {
    if (profileDetailsSaved) {
      return "Your profile details were saved, but we couldn't save your testimonials. The testimonials area could not be reached safely. Try again in a few minutes.";
    }

    return "We couldn't save your testimonials. The testimonials area could not be reached safely. Try again in a few minutes.";
  }

  return "We couldn't save your profile just now. Your changes did not reach the server. Check your connection and try again.";
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETENESS CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function calcCompleteness(data: {
  bio: string;
  phone: string;
  location: string;
  work_experience: WorkExp[];
  education: Education[];
  skills_structured: SkillsStructured;
  languages: Language[];
  certifications: Certification[];
}): number {
  let score = 0;
  if (data.bio?.trim().length > 20) score += 10;
  if (data.work_experience?.length >= 1) score += 25;
  if (data.education?.length >= 1) score += 20;
  const totalSkills =
    (data.skills_structured?.technical?.length || 0) +
    (data.skills_structured?.soft?.length || 0) +
    (data.skills_structured?.tools?.length || 0);
  if (totalSkills >= 3) score += 15;
  if (data.phone?.trim() && data.location?.trim()) score += 10;
  if (data.languages?.length >= 1) score += 10;
  if (data.certifications?.length >= 1) score += 10;
  return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  color = COLORS.indigo,
  expanded,
  onToggle,
}: {
  icon: any;
  title: string;
  color?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.sectionIcon, { backgroundColor: `${color}18` }]}>
        <Icon size={18} color={color} weight="duotone" />
      </View>
      <Text
        variant="label"
        color={COLORS.snow}
        style={{ flex: 1, marginLeft: 12 }}
      >
        {title}
      </Text>
      {expanded ? (
        <CaretUp size={18} color={COLORS.fog} />
      ) : (
        <CaretDown size={18} color={COLORS.fog} />
      )}
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  keyboardType = "default",
  required = false,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: any;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 6,
          gap: 4,
        }}
      >
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={{ color: COLORS.rose }}> *</Text>}
        </Text>
      </View>
      {hint && (
        <Text variant="caption" color={COLORS.fog} style={{ marginBottom: 6 }}>
          {hint}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={COLORS.fog}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMulti]}
      />
      {maxLength && (
        <Text
          variant="caption"
          color={COLORS.fog}
          style={{ textAlign: "right", marginTop: 4 }}
        >
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  color = COLORS.indigo,
  placeholder = "Add skill…",
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  color?: string;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const handleAdd = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onAdd(v);
      setInput("");
    }
  };
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.tagWrap}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => onRemove(tag)}
            style={[
              styles.tag,
              { backgroundColor: `${color}18`, borderColor: `${color}44` },
            ]}
          >
            <Text style={{ fontSize: 12, color, fontWeight: "600" }}>
              {tag}
            </Text>
            <Text style={{ fontSize: 12, color, marginLeft: 4 }}>×</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.tagInputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            placeholder={placeholder}
            placeholderTextColor={COLORS.fog}
            returnKeyType="done"
            style={styles.tagTextInput}
          />
          <TouchableOpacity
            onPress={handleAdd}
            style={[styles.tagAddBtn, { backgroundColor: `${color}22` }]}
          >
            <Plus size={14} color={color} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CEFRPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {CEFR_LEVELS.map((level) => (
        <TouchableOpacity
          key={level}
          onPress={() => onChange(level)}
          style={[
            styles.cefrBtn,
            value === level && {
              backgroundColor: COLORS.indigo,
              borderColor: COLORS.indigo,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: value === level ? "#fff" : COLORS.slate,
            }}
          >
            {level}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileEditScreen() {
  const { profile, updateProfile, user } = useAuthStore();
  const { showToast } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingSkills, setGeneratingSkills] = useState(false);

  // Detect if user is a design user — controls which sections show
  const isDesignUser = (profile as any)?.profession_type === "design";

  // Section expanded state
  const [sections, setSections] = useState({
    about: true,
    experience: true,
    education: true,
    skills: false,
    languages: false,
    certifications: false,
    testimonials: false,
    links: false,
    // Only shown for design users
    design: isDesignUser,
  });

  const toggleSection = (key: keyof typeof sections) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [phone, setPhone] = useState((profile as any)?.phone || "");
  const [location, setLocation] = useState((profile as any)?.location || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [dob, setDob] = useState((profile as any)?.dob || "");
  const [nationality, setNationality] = useState(
    (profile as any)?.nationality || "",
  );
  const [drivingLicence, setDrivingLicence] = useState(
    (profile as any)?.driving_licence || "",
  );

  // Design-specific: Google Drive portfolio link
  const [designDriveUrl, setDesignDriveUrl] = useState(
    (profile as any)?.design_portfolio_drive_url || "",
  );

  const [workExp, setWorkExp] = useState<WorkExp[]>(() => {
    const raw = (profile as any)?.work_experience;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [];
  });

  const [education, setEducation] = useState<Education[]>(() => {
    const raw = (profile as any)?.education;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [];
  });

  const [skillsStructured, setSkillsStructured] = useState<SkillsStructured>(
    () => {
      const raw = (profile as any)?.skills_structured;
      if (raw && typeof raw === "object") return raw;
      const flat = profile?.skills || [];
      return {
        technical: [],
        soft: Array.isArray(flat) ? flat : [],
        tools: [],
      };
    },
  );

  const [languages, setLanguages] = useState<Language[]>(() => {
    const raw = (profile as any)?.languages;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [];
  });

  const [certifications, setCertifications] = useState<Certification[]>(() => {
    const raw = (profile as any)?.certifications;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [];
  });

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoaded, setTestimonialsLoaded] = useState(false);
  const [testimonialsDirty, setTestimonialsDirty] = useState(false);
  const [testimonialsLoadError, setTestimonialsLoadError] = useState<
    string | null
  >(null);

  const [githubUsername, setGithubUsername] = useState(
    profile?.github_username || "",
  );
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || "");

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadTestimonials() {
      const { data, error } = await supabase
        .from("portfolio_testimonials" as any)
        .select(
          "id,author_name,author_role,author_company,quote_text,display_permission_confirmed",
        )
        .eq("user_id", user!.id)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (error) {
        setTestimonialsLoaded(false);
        setTestimonialsLoadError(TESTIMONIALS_LOAD_MESSAGE);
        return;
      }

      setTestimonials(
        ((data as any[]) || []).map((item) => ({
          id: item.id || uid(),
          author_name: item.author_name || "",
          author_role: item.author_role || "",
          author_company: item.author_company || "",
          quote_text: item.quote_text || "",
          display_permission_confirmed:
            item.display_permission_confirmed === true,
        })),
      );
      setTestimonialsLoaded(true);
      setTestimonialsLoadError(null);
      setTestimonialsDirty(false);
    }

    loadTestimonials();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Completeness ───────────────────────────────────────────────────────────
  const completeness = calcCompleteness({
    bio,
    phone,
    location,
    work_experience: workExp,
    education,
    skills_structured: skillsStructured,
    languages,
    certifications,
  });

  // ── AI Bio generation ──────────────────────────────────────────────────────
  const handleGenerateBio = async () => {
    if (!jobTitle && !profile?.job_title) {
      return showToast(
        "Add a job title first so AI knows what to write",
        "error",
      );
    }
    setGeneratingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-career-chat",
        {
          method: "POST",
          body: {
            action: "generate_bio",
            job_title: jobTitle || profile?.job_title,
            industry: profile?.industry || "Technology",
            experience_years: profile?.experience_years || 4,
            skills: [
              ...skillsStructured.technical.slice(0, 3),
              ...skillsStructured.soft.slice(0, 3),
            ],
          },
        },
      );
      if (!error && data?.bio) {
        setBio(data.bio);
        showToast(
          "Bio generated! Edit it to make it more personal.",
          "success",
        );
      } else {
        showToast("Could not generate bio. Add it manually.", "error");
      }
    } catch {
      showToast("Bio generation failed. Add it manually.", "error");
    } finally {
      setGeneratingBio(false);
    }
  };

  // ── AI Skills suggestion ───────────────────────────────────────────────────
  const handleSuggestSkills = async () => {
    if (!jobTitle && !profile?.job_title) {
      return showToast("Add a job title first", "error");
    }
    setGeneratingSkills(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-career-chat",
        {
          method: "POST",
          body: {
            action: "suggest_skills",
            job_title: jobTitle || profile?.job_title,
            industry: profile?.industry || "Technology",
          },
        },
      );
      if (!error && data?.skills) {
        const s = data.skills as {
          technical: string[];
          soft: string[];
          tools: string[];
        };
        setSkillsStructured((prev) => ({
          technical: [...new Set([...prev.technical, ...(s.technical || [])])],
          soft: [...new Set([...prev.soft, ...(s.soft || [])])],
          tools: [...new Set([...prev.tools, ...(s.tools || [])])],
        }));
        showToast("Skills suggested! Remove any that don't apply.", "success");
      } else {
        showToast("Could not suggest skills right now.", "error");
      }
    } catch {
      showToast("Skills suggestion failed.", "error");
    } finally {
      setGeneratingSkills(false);
    }
  };

  // ── Work Experience helpers ────────────────────────────────────────────────
  const addExp = () =>
    setWorkExp((prev) => [
      ...prev,
      {
        id: uid(),
        title: "",
        company: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: "",
        achievements: [""],
      },
    ]);

  const removeExp = (id: string) =>
    setWorkExp((prev) => prev.filter((e) => e.id !== id));

  const updateExp = (id: string, field: keyof WorkExp, value: any) =>
    setWorkExp((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );

  const addAchievement = (expId: string) =>
    setWorkExp((prev) =>
      prev.map((e) =>
        e.id === expId && e.achievements.length < 5
          ? { ...e, achievements: [...e.achievements, ""] }
          : e,
      ),
    );

  const updateAchievement = (expId: string, index: number, value: string) =>
    setWorkExp((prev) =>
      prev.map((e) =>
        e.id === expId
          ? {
              ...e,
              achievements: e.achievements.map((a, i) =>
                i === index ? value : a,
              ),
            }
          : e,
      ),
    );

  const removeAchievement = (expId: string, index: number) =>
    setWorkExp((prev) =>
      prev.map((e) =>
        e.id === expId
          ? { ...e, achievements: e.achievements.filter((_, i) => i !== index) }
          : e,
      ),
    );

  // ── Education helpers ──────────────────────────────────────────────────────
  const addEdu = () =>
    setEducation((prev) => [
      ...prev,
      {
        id: uid(),
        degree: "",
        institution: "",
        field: "",
        start_year: "",
        graduation_year: "",
        grade: "",
      },
    ]);

  const removeEdu = (id: string) =>
    setEducation((prev) => prev.filter((e) => e.id !== id));

  const updateEdu = (id: string, field: keyof Education, value: string) =>
    setEducation((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );

  // ── Language helpers ───────────────────────────────────────────────────────
  const addLang = () =>
    setLanguages((prev) => [...prev, { id: uid(), language: "", cefr: "B2" }]);

  const removeLang = (id: string) =>
    setLanguages((prev) => prev.filter((l) => l.id !== id));

  const updateLang = (id: string, field: keyof Language, value: string) =>
    setLanguages((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );

  // ── Certification helpers ──────────────────────────────────────────────────
  const addCert = () =>
    setCertifications((prev) => [
      ...prev,
      { id: uid(), name: "", issuer: "", year: "" },
    ]);

  const removeCert = (id: string) =>
    setCertifications((prev) => prev.filter((c) => c.id !== id));

  const updateCert = (id: string, field: keyof Certification, value: string) =>
    setCertifications((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const requireTestimonialsReady = () => {
    if (testimonialsLoaded) return true;
    showToast(
      testimonialsLoadError || TESTIMONIALS_STILL_LOADING_MESSAGE,
      "error",
    );
    return false;
  };

  const addTestimonial = () => {
    if (!requireTestimonialsReady()) return;
    setTestimonialsDirty(true);
    setTestimonials((prev) => [
      ...prev,
      {
        id: uid(),
        author_name: "",
        author_role: "",
        author_company: "",
        quote_text: "",
        display_permission_confirmed: false,
      },
    ]);
  };

  const removeTestimonial = (id: string) => {
    if (!requireTestimonialsReady()) return;
    setTestimonialsDirty(true);
    setTestimonials((prev) => prev.filter((item) => item.id !== id));
  };

  const updateTestimonial = (
    id: string,
    field: keyof Testimonial,
    value: string | boolean,
  ) => {
    if (!requireTestimonialsReady()) return;
    setTestimonialsDirty(true);
    setTestimonials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const testimonialHasContent = (item: Testimonial) =>
    Boolean(
      item.author_name.trim() ||
        item.author_role.trim() ||
        item.author_company.trim() ||
        item.quote_text.trim(),
    );

  const validateTestimonials = () => {
    for (const item of testimonials) {
      if (!testimonialHasContent(item)) continue;
      if (
        !item.author_name.trim() ||
        !item.author_role.trim() ||
        !item.quote_text.trim()
      ) {
        showToast(
          "Each testimonial needs a name, role, and quote before it can be saved.",
          "error",
        );
        return false;
      }
      if (!item.display_permission_confirmed) {
        showToast(
          "Confirm permission before saving a testimonial.",
          "error",
        );
        return false;
      }
    }
    return true;
  };

  const saveTestimonials = async () => {
    if (!user?.id || !testimonialsDirty) return;
    if (!testimonialsLoaded) {
      throw new Error(TESTIMONIALS_UNAVAILABLE_ERROR);
    }

    const cleanTestimonials = testimonials
      .filter(testimonialHasContent)
      .map((item, index) => ({
        user_id: user.id,
        author_name: item.author_name.trim(),
        author_role: item.author_role.trim(),
        author_company: item.author_company.trim() || null,
        quote_text: item.quote_text.trim(),
        display_permission_confirmed: item.display_permission_confirmed,
        sort_order: index,
      }));

    const { error: deleteError } = await supabase
      .from("portfolio_testimonials" as any)
      .delete()
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;
    if (cleanTestimonials.length === 0) return;

    const { error: insertError } = await supabase
      .from("portfolio_testimonials" as any)
      .insert(cleanTestimonials);

    if (insertError) throw insertError;
  };

  // ── Drive URL validation ───────────────────────────────────────────────────
  const validateDriveUrl = (url: string): boolean => {
    if (!url.trim()) return true; // empty is fine
    return (
      url.startsWith("https://drive.google.com") ||
      url.startsWith("https://docs.google.com")
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fullName.trim()) return showToast("Full name is required", "error");
    if (!validateTestimonials()) return;

    // Validate Drive URL if entered
    if (
      isDesignUser &&
      designDriveUrl.trim() &&
      !validateDriveUrl(designDriveUrl)
    ) {
      return showToast(
        "Portfolio link must be a Google Drive URL (drive.google.com)",
        "error",
      );
    }

    setSaving(true);
    let profileDetailsSaved = false;
    try {
      const completenessScore = calcCompleteness({
        bio,
        phone,
        location,
        work_experience: workExp,
        education,
        skills_structured: skillsStructured,
        languages,
        certifications,
      });

      await updateProfile({
        full_name: fullName.trim(),
        job_title: jobTitle.trim(),
        bio: bio.trim(),
        github_username: githubUsername.trim(),
        linkedin_url: linkedinUrl.trim(),
        ...({
          phone: phone.trim(),
          location: location.trim(),
          dob: dob.trim(),
          nationality: nationality.trim(),
          driving_licence: drivingLicence.trim(),
          work_experience: workExp,
          education,
          skills_structured: skillsStructured,
          languages,
          certifications,
          profile_completeness: completenessScore,
          skills: [
            ...skillsStructured.technical,
            ...skillsStructured.soft,
            ...skillsStructured.tools,
          ],
          // Design-specific field — only saved when present
          ...(isDesignUser && {
            design_portfolio_drive_url: designDriveUrl.trim(),
          }),
        } as any),
      });
      profileDetailsSaved = true;
      await saveTestimonials();

      showToast("Profile saved!", "success");
      setTimeout(() => router.back(), 800);
    } catch (err) {
      showToast(getProfileSaveErrorMessage(err, profileDetailsSaved), "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Completeness bar ───────────────────────────────────────────────────────
  const CompletenessBar = () => (
    <GlassCard padding={16} style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text variant="label" color={COLORS.snow}>
          Profile Completeness
        </Text>
        <Text
          variant="label"
          color={completeness >= 40 ? COLORS.emerald : COLORS.gold}
          style={{ fontWeight: "700" }}
        >
          {completeness}%
        </Text>
      </View>
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${completeness}%` as any,
              backgroundColor:
                completeness >= 40 ? COLORS.emerald : COLORS.gold,
            },
          ]}
        />
      </View>
      {completeness < 40 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          <Info size={14} color={COLORS.gold} />
          <Text variant="caption" color={COLORS.gold}>
            Reach 40% for better CV quality
          </Text>
        </View>
      )}
      <View style={styles.completenessHints}>
        {[
          { label: "Bio", done: bio.trim().length > 20, points: 10 },
          { label: "Experience", done: workExp.length > 0, points: 25 },
          { label: "Education", done: education.length > 0, points: 20 },
          {
            label: "3+ Skills",
            done:
              skillsStructured.technical.length +
                skillsStructured.soft.length +
                skillsStructured.tools.length >=
              3,
            points: 15,
          },
          {
            label: "Phone + Location",
            done: !!(phone.trim() && location.trim()),
            points: 10,
          },
          { label: "Language", done: languages.length > 0, points: 10 },
          {
            label: "Certification",
            done: certifications.length > 0,
            points: 10,
          },
        ].map((item) => (
          <View key={item.label} style={styles.completenessHint}>
            <Text
              style={{
                fontSize: 12,
                color: item.done ? COLORS.emerald : COLORS.fog,
              }}
            >
              {item.done ? "✓" : "○"}
            </Text>
            <Text
              variant="caption"
              color={item.done ? COLORS.emerald : COLORS.fog}
              style={{ marginLeft: 4 }}
            >
              {item.label} (+{item.points}%)
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(79,70,229,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={COLORS.snow} />
          </TouchableOpacity>
          <Text variant="h2" style={{ flex: 1, marginLeft: 12 }}>
            Profile Builder
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <>
                <FloppyDisk size={16} color="#fff" weight="fill" />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#fff",
                    fontWeight: "700",
                    marginLeft: 6,
                  }}
                >
                  Save
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CompletenessBar />

            {/* ── ABOUT ME ────────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={User}
                title="About Me"
                color={COLORS.indigo}
                expanded={sections.about}
                onToggle={() => toggleSection("about")}
              />
              {sections.about && (
                <View style={styles.sectionBody}>
                  <Field
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    required
                  />
                  <Field
                    label="Professional Title"
                    value={jobTitle}
                    onChangeText={setJobTitle}
                    placeholder="e.g. Backend Developer"
                    required
                  />
                  <Field
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+44 7700 000000"
                    keyboardType="phone-pad"
                  />
                  <Field
                    label="City / Location"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. London, UK"
                  />

                  {/* Bio with AI generate */}
                  <View style={styles.field}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={styles.fieldLabel}>
                        Bio / Personal Statement
                      </Text>
                      <TouchableOpacity
                        onPress={handleGenerateBio}
                        disabled={generatingBio}
                        style={styles.aiBtn}
                        activeOpacity={0.8}
                      >
                        {generatingBio ? (
                          <ActivityIndicator size={12} color={COLORS.indigo} />
                        ) : (
                          <Sparkle
                            size={12}
                            color={COLORS.indigo}
                            weight="fill"
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.indigo,
                            fontWeight: "700",
                            marginLeft: 4,
                          }}
                        >
                          {generatingBio ? "Generating…" : "Generate with AI"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Write a short professional summary…"
                      placeholderTextColor={COLORS.fog}
                      multiline
                      maxLength={400}
                      style={[
                        styles.input,
                        styles.inputMulti,
                        { minHeight: 90 },
                      ]}
                    />
                    <Text
                      variant="caption"
                      color={COLORS.fog}
                      style={{ textAlign: "right", marginTop: 4 }}
                    >
                      {bio.length}/400
                    </Text>
                  </View>

                  {/* Europass extras */}
                  <View style={styles.eurowrap}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <Info size={14} color={COLORS.fog} />
                      <Text variant="caption" color={COLORS.fog}>
                        Date of birth and nationality are used in Europass and
                        International CVs only
                      </Text>
                    </View>
                    <Field
                      label="Date of Birth"
                      value={dob}
                      onChangeText={setDob}
                      placeholder="DD/MM/YYYY"
                    />
                    <Field
                      label="Nationality"
                      value={nationality}
                      onChangeText={setNationality}
                      placeholder="e.g. Nigerian"
                    />
                    <Field
                      label="Driving Licence"
                      value={drivingLicence}
                      onChangeText={setDrivingLicence}
                      placeholder="e.g. B (Full UK)"
                    />
                  </View>
                </View>
              )}
            </GlassCard>

            {/* ── DESIGN PORTFOLIO (design users only) ──────────────────── */}
            {isDesignUser && (
              <GlassCard padding={0} style={styles.sectionCard}>
                <SectionHeader
                  icon={Palette}
                  title="Design Portfolio"
                  color={COLORS.gold}
                  expanded={sections.design}
                  onToggle={() => toggleSection("design")}
                />
                {sections.design && (
                  <View style={styles.sectionBody}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: "rgba(201,148,10,0.07)",
                        borderWidth: 1,
                        borderColor: "rgba(201,148,10,0.25)",
                      }}
                    >
                      <Info
                        size={14}
                        color={COLORS.gold}
                        style={{ marginTop: 1 }}
                      />
                      <Text
                        variant="caption"
                        color={COLORS.gold}
                        style={{ flex: 1, lineHeight: 18 }}
                      >
                        Add a Google Drive link to showcase extra projects in
                        your live portfolio. This link will appear as a "View
                        More Work" button for visitors.
                      </Text>
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        Google Drive Portfolio Link
                      </Text>
                      <Text
                        variant="caption"
                        color={COLORS.fog}
                        style={{ marginBottom: 8 }}
                      >
                        Paste a shareable Google Drive folder link containing
                        your extra design work
                      </Text>
                      <TextInput
                        value={designDriveUrl}
                        onChangeText={setDesignDriveUrl}
                        placeholder="https://drive.google.com/drive/folders/..."
                        placeholderTextColor={COLORS.fog}
                        autoCapitalize="none"
                        keyboardType="url"
                        style={styles.input}
                      />
                      {designDriveUrl.trim().length > 0 &&
                        !validateDriveUrl(designDriveUrl) && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 6,
                            }}
                          >
                            <Info size={13} color={COLORS.rose} />
                            <Text
                              variant="caption"
                              style={{ color: COLORS.rose }}
                            >
                              Must be a Google Drive link (drive.google.com)
                            </Text>
                          </View>
                        )}
                    </View>

                    <View
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderWidth: 1,
                        borderColor: COLORS.rim,
                      }}
                    >
                      <Text
                        variant="caption"
                        color={COLORS.slate}
                        style={{ lineHeight: 18 }}
                      >
                        To create a shareable link:{"\n"}
                        1. Open Google Drive → right-click your folder{"\n"}
                        2. Share → Anyone with the link → Viewer{"\n"}
                        3. Copy link and paste it above
                      </Text>
                    </View>
                  </View>
                )}
              </GlassCard>
            )}

            {/* ── WORK EXPERIENCE ───────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={Briefcase}
                title={`Work Experience${workExp.length > 0 ? ` (${workExp.length})` : ""}`}
                color="#10B981"
                expanded={sections.experience}
                onToggle={() => toggleSection("experience")}
              />
              {sections.experience && (
                <View style={styles.sectionBody}>
                  {workExp.map((exp, index) => (
                    <View key={exp.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text variant="label" color={COLORS.snow}>
                          {exp.title || `Position ${index + 1}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeExp(exp.id)}
                          style={styles.removeBtn}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                      <Field
                        label="Job Title"
                        value={exp.title}
                        onChangeText={(v) => updateExp(exp.id, "title", v)}
                        required
                      />
                      <Field
                        label="Company"
                        value={exp.company}
                        onChangeText={(v) => updateExp(exp.id, "company", v)}
                        required
                      />
                      <Field
                        label="Location"
                        value={exp.location}
                        onChangeText={(v) => updateExp(exp.id, "location", v)}
                        placeholder="e.g. London, UK"
                      />
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Start Date"
                            value={exp.start_date}
                            onChangeText={(v) =>
                              updateExp(exp.id, "start_date", v)
                            }
                            placeholder="MM/YYYY"
                            required
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="End Date"
                            value={exp.is_current ? "Present" : exp.end_date}
                            onChangeText={(v) =>
                              updateExp(exp.id, "end_date", v)
                            }
                            placeholder="MM/YYYY"
                          />
                        </View>
                      </View>
                      <View style={styles.switchRow}>
                        <Text variant="caption" color={COLORS.slate}>
                          Currently working here
                        </Text>
                        <Switch
                          value={exp.is_current}
                          onValueChange={(v) =>
                            updateExp(exp.id, "is_current", v)
                          }
                          trackColor={{
                            false: COLORS.rim,
                            true: COLORS.indigo,
                          }}
                          thumbColor="#fff"
                        />
                      </View>

                      {/* Achievements */}
                      <Text
                        style={[
                          styles.fieldLabel,
                          { marginBottom: 8, marginTop: 4 },
                        ]}
                      >
                        Key Achievements
                      </Text>
                      {exp.achievements.map((ach, i) => (
                        <View key={i} style={styles.achieveRow}>
                          <Text style={{ color: COLORS.fog, marginRight: 8 }}>
                            •
                          </Text>
                          <TextInput
                            value={ach}
                            onChangeText={(v) =>
                              updateAchievement(exp.id, i, v)
                            }
                            placeholder="e.g. Reduced load time by 40%…"
                            placeholderTextColor={COLORS.fog}
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          />
                          {exp.achievements.length > 1 && (
                            <TouchableOpacity
                              onPress={() => removeAchievement(exp.id, i)}
                              style={{ marginLeft: 8 }}
                            >
                              <Trash size={14} color={COLORS.fog} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {exp.achievements.length < 5 && (
                        <TouchableOpacity
                          onPress={() => addAchievement(exp.id)}
                          style={styles.addRowBtn}
                        >
                          <Plus size={14} color={COLORS.slate} />
                          <Text
                            variant="caption"
                            color={COLORS.slate}
                            style={{ marginLeft: 6 }}
                          >
                            Add achievement
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={addExp}
                    style={styles.addEntryBtn}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={COLORS.emerald} weight="bold" />
                    <Text
                      variant="label"
                      color={COLORS.emerald}
                      style={{ marginLeft: 8 }}
                    >
                      Add Work Experience
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* ── EDUCATION ─────────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={GraduationCap}
                title={`Education${education.length > 0 ? ` (${education.length})` : ""}`}
                color={COLORS.gold}
                expanded={sections.education}
                onToggle={() => toggleSection("education")}
              />
              {sections.education && (
                <View style={styles.sectionBody}>
                  {education.map((edu, index) => (
                    <View key={edu.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text variant="label" color={COLORS.snow}>
                          {edu.degree || `Qualification ${index + 1}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeEdu(edu.id)}
                          style={styles.removeBtn}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                      <Field
                        label="Degree / Qualification"
                        value={edu.degree}
                        onChangeText={(v) => updateEdu(edu.id, "degree", v)}
                        required
                        placeholder="e.g. BSc Computer Science"
                      />
                      <Field
                        label="Institution"
                        value={edu.institution}
                        onChangeText={(v) =>
                          updateEdu(edu.id, "institution", v)
                        }
                        required
                        placeholder="e.g. University of Lagos"
                      />
                      <Field
                        label="Field of Study"
                        value={edu.field}
                        onChangeText={(v) => updateEdu(edu.id, "field", v)}
                        placeholder="e.g. Computer Science"
                      />
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Start Year"
                            value={edu.start_year}
                            onChangeText={(v) =>
                              updateEdu(edu.id, "start_year", v)
                            }
                            placeholder="2018"
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Graduation Year"
                            value={edu.graduation_year}
                            onChangeText={(v) =>
                              updateEdu(edu.id, "graduation_year", v)
                            }
                            placeholder="2022"
                            keyboardType="number-pad"
                            required
                          />
                        </View>
                      </View>
                      <Field
                        label="Grade / GPA"
                        value={edu.grade}
                        onChangeText={(v) => updateEdu(edu.id, "grade", v)}
                        placeholder="e.g. 2:1, 3.8 GPA"
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={addEdu}
                    style={styles.addEntryBtn}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={COLORS.gold} weight="bold" />
                    <Text
                      variant="label"
                      color={COLORS.gold}
                      style={{ marginLeft: 8 }}
                    >
                      Add Education
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* ── SKILLS ────────────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={Lightning}
                title="Skills"
                color={COLORS.indigo}
                expanded={sections.skills}
                onToggle={() => toggleSection("skills")}
              />
              {sections.skills && (
                <View style={styles.sectionBody}>
                  <TagInput
                    label="Technical Skills"
                    tags={skillsStructured.technical}
                    onAdd={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        technical: [...s.technical, v],
                      }))
                    }
                    onRemove={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        technical: s.technical.filter((x) => x !== v),
                      }))
                    }
                    color={COLORS.indigo}
                    placeholder="e.g. Node.js, Python…"
                  />
                  <TagInput
                    label="Tools & Platforms"
                    tags={skillsStructured.tools}
                    onAdd={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        tools: [...s.tools, v],
                      }))
                    }
                    onRemove={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        tools: s.tools.filter((x) => x !== v),
                      }))
                    }
                    color="#10B981"
                    placeholder="e.g. Docker, AWS…"
                  />
                  <TagInput
                    label="Soft Skills"
                    tags={skillsStructured.soft}
                    onAdd={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        soft: [...s.soft, v],
                      }))
                    }
                    onRemove={(v) =>
                      setSkillsStructured((s) => ({
                        ...s,
                        soft: s.soft.filter((x) => x !== v),
                      }))
                    }
                    color={COLORS.gold}
                    placeholder="e.g. Leadership…"
                  />
                  <TouchableOpacity
                    onPress={handleSuggestSkills}
                    disabled={generatingSkills}
                    style={styles.suggestBtn}
                    activeOpacity={0.8}
                  >
                    {generatingSkills ? (
                      <ActivityIndicator size={16} color={COLORS.indigo} />
                    ) : (
                      <Sparkle size={16} color={COLORS.indigo} weight="fill" />
                    )}
                    <Text
                      variant="label"
                      color={COLORS.indigo}
                      style={{ marginLeft: 8 }}
                    >
                      {generatingSkills
                        ? "Suggesting…"
                        : "Suggest Skills with AI"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* ── LANGUAGES ─────────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={ChatTeardrop}
                title={`Languages${languages.length > 0 ? ` (${languages.length})` : ""}`}
                color="#8B5CF6"
                expanded={sections.languages}
                onToggle={() => toggleSection("languages")}
              />
              {sections.languages && (
                <View style={styles.sectionBody}>
                  {languages.map((lang) => (
                    <View key={lang.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text variant="label" color={COLORS.snow}>
                          {lang.language || "Language"}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeLang(lang.id)}
                          style={styles.removeBtn}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                      <Field
                        label="Language"
                        value={lang.language}
                        onChangeText={(v) => updateLang(lang.id, "language", v)}
                        placeholder="e.g. English"
                        required
                      />
                      <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>
                        CEFR Level
                      </Text>
                      <CEFRPicker
                        value={lang.cefr}
                        onChange={(v) => updateLang(lang.id, "cefr", v)}
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={addLang}
                    style={styles.addEntryBtn}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#8B5CF6" weight="bold" />
                    <Text
                      variant="label"
                      color="#8B5CF6"
                      style={{ marginLeft: 8 }}
                    >
                      Add Language
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* ── CERTIFICATIONS ────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={Certificate}
                title={`Certifications${certifications.length > 0 ? ` (${certifications.length})` : ""}`}
                color={COLORS.gold}
                expanded={sections.certifications}
                onToggle={() => toggleSection("certifications")}
              />
              {sections.certifications && (
                <View style={styles.sectionBody}>
                  {certifications.map((cert, index) => (
                    <View key={cert.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text variant="label" color={COLORS.snow}>
                          {cert.name || `Certification ${index + 1}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeCert(cert.id)}
                          style={styles.removeBtn}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                      <Field
                        label="Certificate Name"
                        value={cert.name}
                        onChangeText={(v) => updateCert(cert.id, "name", v)}
                        required
                      />
                      <Field
                        label="Issuing Organisation"
                        value={cert.issuer}
                        onChangeText={(v) => updateCert(cert.id, "issuer", v)}
                        placeholder="e.g. Google, AWS, Microsoft"
                      />
                      <Field
                        label="Year"
                        value={cert.year}
                        onChangeText={(v) => updateCert(cert.id, "year", v)}
                        placeholder="e.g. 2023"
                        keyboardType="number-pad"
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={addCert}
                    style={styles.addEntryBtn}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={COLORS.gold} weight="bold" />
                    <Text
                      variant="label"
                      color={COLORS.gold}
                      style={{ marginLeft: 8 }}
                    >
                      Add Certification
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* ── LINKS ─────────────────────────────────────────────────── */}
            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={ChatTeardrop}
                title={`Testimonials${testimonials.length > 0 ? ` (${testimonials.length})` : ""}`}
                color={COLORS.emerald}
                expanded={sections.testimonials}
                onToggle={() => toggleSection("testimonials")}
              />
              {sections.testimonials && (
                <View style={styles.sectionBody}>
                  {testimonialsLoadError && (
                    <View style={styles.errorBox}>
                      <Info size={14} color={COLORS.rose} />
                      <Text
                        variant="caption"
                        color={COLORS.slate}
                        style={{ flex: 1, lineHeight: 18 }}
                      >
                        {testimonialsLoadError}
                      </Text>
                    </View>
                  )}
                  <View style={styles.noticeBox}>
                    <Info size={14} color={COLORS.emerald} />
                    <Text
                      variant="caption"
                      color={COLORS.slate}
                      style={{ flex: 1, lineHeight: 18 }}
                    >
                      Add testimonials only when the person has clearly agreed
                      that you can show their words and name on your portfolio.
                    </Text>
                  </View>

                  {testimonials.map((item, index) => (
                    <View key={item.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text variant="label" color={COLORS.snow}>
                          {item.author_name || `Testimonial ${index + 1}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeTestimonial(item.id)}
                          style={styles.removeBtn}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                      <Field
                        label="Author Name"
                        value={item.author_name}
                        onChangeText={(value) =>
                          updateTestimonial(item.id, "author_name", value)
                        }
                        placeholder="e.g. Priya Shah"
                        required
                      />
                      <Field
                        label="Author Role"
                        value={item.author_role}
                        onChangeText={(value) =>
                          updateTestimonial(item.id, "author_role", value)
                        }
                        placeholder="e.g. Product Lead"
                        required
                      />
                      <Field
                        label="Author Company"
                        value={item.author_company}
                        onChangeText={(value) =>
                          updateTestimonial(item.id, "author_company", value)
                        }
                        placeholder="Optional"
                      />
                      <Field
                        label="Quote"
                        value={item.quote_text}
                        onChangeText={(value) =>
                          updateTestimonial(item.id, "quote_text", value)
                        }
                        placeholder="Paste the testimonial text"
                        multiline
                        maxLength={360}
                        required
                      />
                      <View style={styles.permissionRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>
                            Display Permission
                          </Text>
                          <Text
                            variant="caption"
                            color={COLORS.fog}
                            style={{ lineHeight: 18 }}
                          >
                            I confirm I have permission to show this quote,
                            name, role, and company on my portfolio.
                          </Text>
                        </View>
                        <Switch
                          value={item.display_permission_confirmed}
                          onValueChange={(value) =>
                            updateTestimonial(
                              item.id,
                              "display_permission_confirmed",
                              value,
                            )
                          }
                          trackColor={{
                            false: COLORS.rim,
                            true: COLORS.emerald,
                          }}
                          thumbColor="#fff"
                        />
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={addTestimonial}
                    style={styles.addEntryBtn}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={COLORS.emerald} weight="bold" />
                    <Text
                      variant="label"
                      color={COLORS.emerald}
                      style={{ marginLeft: 8 }}
                    >
                      Add Testimonial
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            <GlassCard padding={0} style={styles.sectionCard}>
              <SectionHeader
                icon={Link}
                title="Links"
                color={COLORS.slate}
                expanded={sections.links}
                onToggle={() => toggleSection("links")}
              />
              {sections.links && (
                <View style={styles.sectionBody}>
                  {/* Only show GitHub field for non-design users */}
                  {!isDesignUser && (
                    <Field
                      label="GitHub Username"
                      value={githubUsername}
                      onChangeText={setGithubUsername}
                      placeholder="e.g. johndoe"
                    />
                  )}
                  <Field
                    label="LinkedIn URL"
                    value={linkedinUrl}
                    onChangeText={setLinkedinUrl}
                    placeholder="https://linkedin.com/in/…"
                  />
                  {profile?.portfolio_url && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Portfolio URL</Text>
                      <View style={styles.readonlyField}>
                        <Text
                          variant="caption"
                          color={COLORS.cyan}
                          numberOfLines={1}
                        >
                          {profile.portfolio_url}
                        </Text>
                        <Text
                          variant="caption"
                          color={COLORS.fog}
                          style={{ marginLeft: 6 }}
                        >
                          (auto-generated)
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </GlassCard>

            {/* Bottom save button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.bottomSaveBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FloppyDisk size={18} color="#fff" weight="fill" />
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#fff",
                      fontWeight: "700",
                      marginLeft: 10,
                    }}
                  >
                    Save Profile
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.indigo,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.rim,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  completenessHints: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  completenessHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionCard: {
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionBody: {
    padding: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.rim,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.snow,
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  eurowrap: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79,70,229,0.12)",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 120,
  },
  tagTextInput: {
    flex: 1,
    color: COLORS.snow,
    fontSize: 13,
    padding: 4,
  },
  tagAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cefrBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.rim,
  },
  entryCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(244,63,94,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  row2: {
    flexDirection: "row",
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingVertical: 4,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.07)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(244,63,94,0.07)",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.25)",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    paddingVertical: 4,
  },
  achieveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  addEntryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    borderStyle: "dashed",
    marginTop: 4,
  },
  suggestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.indigo}44`,
    backgroundColor: `${COLORS.indigo}0C`,
    marginTop: 8,
  },
  readonlyField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bottomSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.indigo,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
});
