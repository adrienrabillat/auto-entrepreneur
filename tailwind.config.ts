import type { Config } from "tailwindcss";

/**
 * Design Revolut-like — thème clair par défaut, dark via
 * [data-theme="dark"] sur <html>. Toutes les couleurs de base sont
 * remappées sur des CSS variables (canaux RGB), ce qui fait que les
 * classes existantes (`text-ink-900`, `bg-ink-50`, etc.) basculent
 * automatiquement en dark mode sans nécessiter `dark:` préfixes.
 *
 * ink-900 = primary text, ink-700 = body, ink-500 = muted, ink-400 = placeholder.
 * brand-500/600 = accent principal (bleu fintech).
 */
const config: Config = {
  darkMode: ["selector", 'html[data-theme="dark"]'],
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
        // Semantic surfaces — le moyen propre d'aller chercher les surfaces dans le JSX.
        page:        "rgb(var(--c-bg) / <alpha-value>)",
        surface:     "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        divider:     "rgb(var(--c-divider) / <alpha-value>)",

        // Palette ink — remappée sur nos 4 niveaux sémantiques. Les stops
        // intermédiaires (200, 300, etc.) restent dispos pour les bordures
        // et hovers, via interpolation visuelle.
        ink: {
          50:  "rgb(var(--c-surface-2) / <alpha-value>)",
          100: "rgb(var(--c-divider) / <alpha-value>)",
          200: "rgb(var(--c-divider) / <alpha-value>)",
          300: "rgb(var(--c-ink-4) / <alpha-value>)",
          400: "rgb(var(--c-ink-4) / <alpha-value>)",
          500: "rgb(var(--c-ink-3) / <alpha-value>)",
          600: "rgb(var(--c-ink-2) / <alpha-value>)",
          700: "rgb(var(--c-ink-2) / <alpha-value>)",
          800: "rgb(var(--c-ink-1) / <alpha-value>)",
          900: "rgb(var(--c-ink-1) / <alpha-value>)",
        },

        // Brand = accent bleu. Les anciens stops (50..900) pointent tous sur
        // l'accent en différentes intensités visuelles. En pratique on utilise
        // brand-500 / brand-600 côté code.
        brand: {
          50:  "rgb(var(--c-accent) / 0.08)",
          100: "rgb(var(--c-accent) / 0.16)",
          200: "rgb(var(--c-accent) / 0.24)",
          300: "rgb(var(--c-accent) / 0.5)",
          400: "rgb(var(--c-accent) / 0.7)",
          500: "rgb(var(--c-accent) / <alpha-value>)",
          600: "rgb(var(--c-accent) / <alpha-value>)",
          700: "rgb(var(--c-accent-ink) / <alpha-value>)",
          800: "rgb(var(--c-accent-ink) / <alpha-value>)",
          900: "rgb(var(--c-accent-ink) / <alpha-value>)",
        },
        // Anciens tokens "pink" / "accent" remappés sur la même famille (compat).
        pink: {
          400: "rgb(var(--c-accent) / <alpha-value>)",
          500: "rgb(var(--c-accent) / <alpha-value>)",
        },
        accent: {
          50:  "rgb(var(--c-accent) / 0.08)",
          100: "rgb(var(--c-accent) / 0.16)",
          500: "rgb(var(--c-accent) / <alpha-value>)",
          600: "rgb(var(--c-accent) / <alpha-value>)",
          700: "rgb(var(--c-accent-ink) / <alpha-value>)",
        },

        success: {
          50:  "rgb(var(--c-green) / 0.1)",
          100: "rgb(var(--c-green) / 0.18)",
          500: "rgb(var(--c-green) / <alpha-value>)",
          600: "rgb(var(--c-green) / <alpha-value>)",
        },
        warn: {
          50:  "rgb(var(--c-amber) / 0.1)",
          100: "rgb(var(--c-amber) / 0.18)",
          500: "rgb(var(--c-amber) / <alpha-value>)",
          600: "rgb(var(--c-amber) / <alpha-value>)",
        },
        danger: {
          50:  "rgb(var(--c-red) / 0.1)",
          100: "rgb(var(--c-red) / 0.18)",
          500: "rgb(var(--c-red) / <alpha-value>)",
          600: "rgb(var(--c-red) / <alpha-value>)",
        },
      },
      fontSize: {
        hero:    ["72px", { lineHeight: "1", letterSpacing: "-0.035em", fontWeight: "700" }],
        display: ["44px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1:      ["28px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2:      ["20px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3:      ["16px", { lineHeight: "1.35", fontWeight: "600" }],
        body:    ["15px", { lineHeight: "1.55" }],
        small:   ["13px", { lineHeight: "1.5" }],
        xs:      ["12px", { lineHeight: "1.5" }],
      },
      borderRadius: {
        DEFAULT: "14px",
        sm:  "10px",
        md:  "14px",
        lg:  "18px",
        xl:  "20px",
        "2xl": "24px",
        "3xl": "28px",
        pill: "9999px",
      },
      boxShadow: {
        hair: "var(--shadow-hair)",
        soft: "var(--shadow-card)",
        card: "var(--shadow-card)",
        pop:  "var(--shadow-pop)",
        glow: "0 0 0 4px var(--accent-ring)",
      },
      backgroundImage: {
        "brand-gradient":         "linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent-ink)) 100%)",
        "brand-gradient-subtle":  "linear-gradient(135deg, rgb(var(--c-accent) / 0.08) 0%, rgb(var(--c-accent) / 0.02) 100%)",
        "page-aurora":            "radial-gradient(1200px 400px at 80% -10%, rgb(var(--c-accent) / 0.06), transparent 60%)",
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
        // Transition de page style Revolut : la nouvelle vue arrive
        // depuis la droite (16px → 0) en s'estompant. Court et discret,
        // pas de "whoosh" exagéré.
        "page-in": {
          "0%":   { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%":   { boxShadow: "0 0 0 0 rgb(var(--c-green) / 0.5)" },
          "70%":  { boxShadow: "0 0 0 10px rgb(var(--c-green) / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(var(--c-green) / 0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 280ms ease-out both",
        "fade-in":    "fade-in 200ms ease-out both",
        "pop-in":     "pop-in 420ms cubic-bezier(.34,1.56,.64,1) both",
        // Page transition entre modules : 240ms ease-out cubic-bezier
        // "ease-out-expo" pour démarrer vif puis ralentir doucement.
        // Slide horizontal + fade. Volontairement court (240ms) pour
        // que la navigation reste réactive — au-delà de 350ms l'app
        // commence à donner l'impression de ramer.
        "page-in":    "page-in 240ms cubic-bezier(.16,1,.3,1) both",
        // Laisse Tailwind garder son `animate-pulse` par défaut (opacity 0.5 → 1)
        // pour les skeletons. Notre onde verte est désormais exposée comme
        // `animate-pulse-dot` et n'est utilisée QUE sur le dot "Encaissé ce mois".
        "pulse-dot": "pulse-dot 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
