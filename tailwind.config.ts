import type { Config } from "tailwindcss";

/**
 * Modern, vibrant design system. We swapped the warm-cream Notion palette
 * for a crisp slate + a saturated violet brand. The `ink` scale name is
 * kept (so we don't have to rename class usages across the codebase) but
 * its values are now a cool slate instead of the old warm browns.
 *
 * `brand` is the new accent used for CTAs, active nav states, highlights.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
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
        display: ["Inter", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Neutral = cool slate (keeps the `ink-*` class names used across the app)
        ink: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // Vibrant violet / indigo brand
        brand: {
          50: "#EEF0FF",
          100: "#DEE1FF",
          200: "#C3C8FF",
          300: "#9AA1FF",
          400: "#7A7DFF",
          500: "#5B47FF",
          600: "#4636E0",
          700: "#372BB2",
          800: "#2A218A",
          900: "#1E1866",
        },
        // Pink accent (gradient second stop)
        pink: {
          400: "#FF6AD5",
          500: "#F13FAF",
        },
        // Legacy alias so older code still compiles.
        accent: {
          50: "#EEF0FF",
          100: "#DEE1FF",
          500: "#5B47FF",
          600: "#4636E0",
          700: "#372BB2",
        },
        success: { 50: "#ECFDF5", 100: "#D1FAE5", 500: "#10B981", 600: "#059669" },
        warn:    { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 600: "#B45309" },
        danger:  { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 600: "#DC2626" },
      },
      fontSize: {
        display: ["44px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" }],
        h1: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],
        h2: ["22px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        h3: ["17px", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.55" }],
        small: ["13px", { lineHeight: "1.5" }],
        xs: ["12px", { lineHeight: "1.5" }],
      },
      borderRadius: {
        DEFAULT: "10px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "28px",
      },
      boxShadow: {
        hair: "inset 0 0 0 1px rgb(226 232 240 / 1)",
        soft: "0 1px 2px rgb(15 23 42 / 0.04), 0 2px 10px rgb(15 23 42 / 0.04)",
        pop: "0 10px 30px -10px rgb(91 71 255 / 0.25), 0 6px 14px -6px rgb(15 23 42 / 0.10)",
        glow: "0 0 0 1px rgb(91 71 255 / 0.15), 0 12px 32px -8px rgb(91 71 255 / 0.35)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#5B47FF 0%,#8B5FFF 50%,#FF6AD5 100%)",
        "brand-gradient-subtle": "linear-gradient(135deg,#EEF0FF 0%,#FCE8F6 100%)",
        "page-aurora":
          "radial-gradient(1200px 400px at 80% -10%, rgba(91,71,255,0.12), transparent 60%), radial-gradient(900px 300px at -10% 10%, rgba(255,106,213,0.10), transparent 60%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 240ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
