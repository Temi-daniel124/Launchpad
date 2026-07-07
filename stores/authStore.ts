import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  bio: string | null;
  tagline: string | null;
  skills: string[] | null;
  github_username: string | null;
  linkedin_url: string | null;
  target_countries: string[] | null;
  job_type_preference: string | null;
  visa_sponsorship_needed: boolean | null;
  portfolio_url: string | null;
  portfolio_generated_at: string | null;
  portfolio_zip_url: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_plan: string | null;
  profile_photo_url: string | null;
  goals: string[] | null;
  onboarding_completed: boolean | null;
  currency: string | null;
  experience_years: number | null;
  industry: string | null;
  data_consent_given: boolean | null;
  data_consent_timestamp: string | null;
  experience_level: string | null;
  github_token: string | null;
  auto_apply_enabled: boolean | null;
  auto_apply_consent_given: boolean | null;
  auto_apply_consent_timestamp: string | null;
  cv_pdf_url: string | null;
  design_portfolio_drive_url?: string | null;
  // ── BUG #2 FIX: profession routing ────────────────────────────────────────
  profession_type: "tech" | "design" | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  clearState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    }),

  setProfile: (profile) =>
    set({
      profile,
      isOnboarded: profile?.onboarding_completed ?? false,
    }),

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          set({ profile: null, isOnboarded: false, isLoading: false });
        } else {
          console.error("fetchProfile DB error:", error.message);
          set({ isLoading: false });
        }
        return;
      }

      set({
        profile: data,
        isOnboarded: data?.onboarding_completed ?? false,
        isLoading: false,
      });
    } catch (err) {
      console.error("fetchProfile network error:", err);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      set({
        profile: data,
        isOnboarded: data?.onboarding_completed ?? false,
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      throw err;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      isOnboarded: false,
      isLoading: false,
    });
  },

  clearState: () =>
    set({ session: null, user: null, profile: null, isLoading: false }),
}));
