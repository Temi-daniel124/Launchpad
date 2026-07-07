/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        abyss: "#080E1A",
        navy: "#0F1729",
        elevated: "#162038",
        rim: "#1E2D4A",
        indigo: {
          DEFAULT: "#4F46E5",
          light: "#6366F1",
        },
        cyan: "#06B6D4",
        gold: "#F59E0B",
        snow: "#F8FAFC",
        slate: "#94A3B8",
        fog: "#475569",
        emerald: "#10B981",
        rose: "#F43F5E",
      },
    },
  },
  plugins: [],
};
