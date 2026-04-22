import type { Config } from "tailwindcss";

// Notion-inspired palette. Notion's UI is mostly neutral grays with
// a very specific brown/tan for accents. We keep it sober and airy.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Notion uses a custom Inter-like stack. Inter is the closest free match.
        sans: [
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: ["Lora", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Notion gray scale
        ink: {
          50: "#F7F6F3", // page bg
          100: "#F1EFEC",
          200: "#E9E7E2",
          300: "#DCD9D3",
          400: "#B8B5AE",
          500: "#9B9A97",
          600: "#6B6B68",
          700: "#37352F", // Notion body text
          800: "#2F2E29",
          900: "#191918",
        },
        accent: {
          // Notion's "brown" accent (used sparingly)
          50: "#F4EEE9",
          100: "#E6D9CC",
          500: "#9F6B53",
          600: "#8A5A43",
          700: "#6E4632",
        },
        success: { 50: "#EDF3EC", 600: "#4F7C4A" },
        warn: { 50: "#FAF3DD", 600: "#8A6A1A" },
        danger: { 50: "#FBEAE7", 600: "#B24A3E" },
      },
      fontSize: {
        // Tighter headline rhythm like Notion
        "display": ["40px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h1": ["32px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        "h2": ["22px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h3": ["17px", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["15px", { lineHeight: "1.55" }],
        "small": ["13px", { lineHeight: "1.5" }],
        "xs": ["12px", { lineHeight: "1.5" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "14px",
      },
      boxShadow: {
        // Notion uses extremely subtle shadows
        soft: "0 1px 2px rgba(15, 15, 15, 0.04), 0 2px 6px rgba(15, 15, 15, 0.06)",
        pop: "0 4px 12px rgba(15, 15, 15, 0.08), 0 12px 24px rgba(15, 15, 15, 0.08)",
        hair: "inset 0 0 0 1px rgba(55, 53, 47, 0.09)",
      },
    },
  },
  plugins: [],
};

export default config;
