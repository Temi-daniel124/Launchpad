/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        abyss: "#F7F9F8",
        navy: "#FFFFFF",
        elevated: "#F2F6F4",
        rim: "#DDE7E2",
        indigo: {
          DEFAULT: "#159A63",
          light: "#20B978",
        },
        cyan: "#159A63",
        gold: "#A66A00",
        snow: "#122017",
        slate: "#52645B",
        fog: "#7C8C84",
        emerald: "#159A63",
        rose: "#C2414B",
      },
    },
  },
  plugins: [],
};
