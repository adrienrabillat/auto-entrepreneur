import type { Config } from "tailwindcss";

/**
 * Sobre + pro : palette noir + bleu foncé.
 * On conserve les noms de tokens (`brand-*`, `pink-*`, `accent-*`) pour ne pas
 * avoir à renommer des classes à travers tout le code — mais leurs valeurs
 * pointent désormais vers une famille navy / quasi-noir.
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
        // Neutre : slate froid (on garde les classes `ink-*` partout dans le code)
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
        // Marque : navy → noir. Fini le violet.
        brand: {
          50:  "#F1F5FB",
          100: "#E1E8F4",
          200: "#C4D0E6",
          300: "#8AA1CC",
          400: "#4E6DA5",
          500: "#1E3A8A",   // bleu foncé principal
          600: "#172554",   // navy profond
          700: "#0F172A",   // slate-900
          800: "#0A0F1C",
          900: "#04070F",   // quasi-noir
        },
        // Anciennement "rose" → remappé sur la même famille navy pour que les
        // classes `bg-pink-*` utilisées côté PDF / gradients ne cassent rien.
        pink: {
          400: "#1E3A8A",
          500: "#172554",
        },
        accent: {
          50:  "#F1F5FB",
          100: "#E1E8F4",
          500: "#1E3A8A",
          600: "#172554",
          700: "#0F172A",
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
        pop: "0 10px 30px -10px rgb(15 23 42 / 0.45), 0 6px 14px -6px rgb(15 23 42 / 0.15)",
        glow: "0 0 0 1px rgb(30 58 138 / 0.25), 0 12px 32px -8px rgb(15 23 42 / 0.45)",
      },
      backgroundImage: {
        // Dégradé sobre : quasi-noir → bleu nuit
        "brand-gradient": "linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)",
        "brand-gradient-subtle": "linear-gradient(135deg,#F1F5FB 0%,#E1E8F4 100%)",
        "page-aurora":
          "radial-gradient(1200px 400px at 80% -10%, rgba(30,58,138,0.08), transparent 60%), radial-gradient(900px 300px at -10% 10%, rgba(15,23,42,0.06), transparent 60%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(.8)" },
          "70%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 240ms ease-out both",
        "fade-in": "fade-in 180ms ease-out both",
        "pop-in": "pop-in 420ms cubic-bezier(.34,1.56,.64,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
