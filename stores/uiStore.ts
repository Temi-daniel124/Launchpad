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

export const useUIStore = create<UIState>((set) => ({
  isGeneratingPortfolio: false,
  isGeneratingCV: false,
  portfolioProgress: "",
  toast: null,

  setGeneratingPortfolio: (val) => set({ isGeneratingPortfolio: val }),
  setGeneratingCV: (val) => set({ isGeneratingCV: val }),
  setPortfolioProgress: (val) => set({ portfolioProgress: val }),
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}));
