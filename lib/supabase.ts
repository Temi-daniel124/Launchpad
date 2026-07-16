import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://oovunzthzfhructpulbz.supabase.co";
const supabaseAnonKey = "sb_publishable_e4d9hlJUFsC97CATPZuyjA_USsQQ1Lf";

// Secure storage adapter. JWT never touches AsyncStorage on native.
const WebStorageAdapter = {
  getItem: (key: string) =>
    Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const authStorage =
  Platform.OS === "web" ? WebStorageAdapter : ExpoSecureStoreAdapter;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          job_title: string | null;
          industry: string | null;
          experience_level: string | null;
          bio: string | null;
          tagline: string | null;
          skills: string[] | null;
          experience_years: number | null;
          github_username: string | null;
          linkedin_url: string | null;
          target_countries: string[] | null;
          job_type_preference: string | null;
          visa_sponsorship_needed: boolean | null;
          portfolio_url: string | null;
          portfolio_generated_at: string | null;
          github_repo: string | null;
          subscription_status: string | null;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          subscription_plan: string | null;
          subscription_expires_at: string | null;
          theme_preference: string | null;
          currency: string | null;
          data_consent_given: boolean | null;
          profile_photo_url: string | null;
          goals: string[] | null;
          is_active: boolean | null;
          onboarding_completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
    };
  };
};
