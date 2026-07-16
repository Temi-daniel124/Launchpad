import { create } from "zustand";

interface UIState {
  isGeneratingPortfolio: boolean;
  isGeneratingCV: boolean;
  portfolioProgress: string;
  toast: { message: string; type: "success" | "error" | "info" } | null;
  setGeneratingPortfolio: (val: boolean) => void;
  setGeneratingCV: (val: boolean) => void;
  setPortfolioProgress: (val: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  hideToast: () => void;
}

const TECHNICAL_ERROR_PATTERNS = [
  /edge function/i,
  /jwt/i,
  /pgrst/i,
  /postgres/i,
  /supabase/i,
  /network request failed/i,
  /failed to fetch/i,
  /\b\d{3}\b/,
  /\b[a-z_]+_[a-z_]+\b/i,
];

function cleanToastMessage(message: string, type: "success" | "error" | "info") {
  const trimmed = message.trim();

  if (!trimmed) {
    return type === "error"
      ? "Something went wrong. Try again in a few minutes."
      : "";
  }

  if (type !== "error") return trimmed;

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "Something went wrong. This usually clears up on its own. Try again in a few minutes.";
  }

  return trimmed;
}

export const useUIStore = create<UIState>((set) => ({
  isGeneratingPortfolio: false,
  isGeneratingCV: false,
  portfolioProgress: "",
  toast: null,

  setGeneratingPortfolio: (val) => set({ isGeneratingPortfolio: val }),
  setGeneratingCV: (val) => set({ isGeneratingCV: val }),
  setPortfolioProgress: (val) => set({ portfolioProgress: val }),
  showToast: (message, type) =>
    set({ toast: { message: cleanToastMessage(message, type), type } }),
  hideToast: () => set({ toast: null }),
}));
