/**
 * Scène 5 — Features (0:17 → 0:20, 90 frames à 30 fps)
 *
 * Closure de la vidéo : "Asthia s'occupe de tout."
 * 4 cards verticales qui apparaissent en cascade pour rappeler ce
 * qu'Asthia fait sans qu'on ait à y penser. Couleur d'accent BLEUE
 * (brand par défaut Asthia) pour rester cohérent avec la fin du
 * parcours couleur (scène 1 termine sur bleu).
 *
 * Les 4 features (cf. arbitrage user 20/05/2026) :
 *   1. URSSAF déclarée auto — API TDAE officielle
 *   2. Factur-X intégré — Conforme loi 1er sept. 2026
 *   3. Mentions légales auto — Art. 293 B CGI, pénalités, médiateur
 *   4. Export comptable — Excel et PDF/A-3 prêts pour le comptable
 *
 * Timing (frames locales, 90f — version étalée 20s) :
 *   f=0-10       Fade-in scène
 *   f=8-20       Titre slide-up + fade-in
 *   f=24-50+     Cards en cascade (stagger 8f entre chaque, dernière à f=48)
 *   f=58-80      Hold (22f = 0.73s) avant la boucle vers scène 1
 *   f=82-90      Fade-out vers blanc pour boucle seamless
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";
import { outQuart, outExpo } from "../utils/easings";

const ACCENT = COLORS.accents.blue.hex;
const ACCENT_RGB = COLORS.accents.blue.rgb;
const ACCENT_SOFT = `rgba(${ACCENT_RGB[0]}, ${ACCENT_RGB[1]}, ${ACCENT_RGB[2]}, 0.14)`;

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  appearFrame: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  subtitle,
  icon,
  appearFrame,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [appearFrame, appearFrame + 10],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: outQuart,
    },
  );
  const translateY = interpolate(
    frame,
    [appearFrame, appearFrame + 10],
    [16, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: outExpo,
    },
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        padding: 36,
        background: COLORS.surface,
        borderRadius: 28,
        border: `1.5px solid ${COLORS.divider}`,
        boxShadow: "0 2px 6px rgba(10,13,30,0.04)",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Icône — cercle bleu soft avec SVG accent */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: ACCENT_SOFT,
          color: ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.ink1,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            color: COLORS.ink3,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// SVG icons — style outline (équivalent Tabler / Lucide)
const IconShield = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconFile = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const IconScale = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <path d="M3 7h18" />
    <path d="M7 7l-4 8a4 4 0 0 0 8 0z" />
    <path d="M17 7l-4 8a4 4 0 0 0 8 0z" />
  </svg>
);

const IconChart = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 4 5-5" />
  </svg>
);

export const Features: React.FC = () => {
  const frame = useCurrentFrame();

  // Pas de fade-in interne : l'entrée est gérée par la TransitionSeries
  // du Hero (slide-from-bottom depuis Success).

  // Fade-out à la fin pour boucler proprement sur scène 1 (blanc neutre).
  // Scène de 100 f → fondu sur les 8 dernières frames (f=92 → 100).
  const fadeOut = interpolate(frame, [92, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 20], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outExpo,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.pageBg,
        opacity: fadeOut,
        fontFamily: FONTS.sans,
        padding: "100px 100px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Titre */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 64,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: COLORS.ink1,
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Asthia s&apos;occupe{" "}
          <span style={{ color: ACCENT }}>de tout</span>.
        </h1>
      </div>

      {/* Stack de cards en cascade (stagger 5f) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <FeatureCard
          title="URSSAF déclarée auto"
          subtitle="API TDAE officielle. Jamais oublier une échéance."
          icon={<IconShield />}
          appearFrame={24}
        />
        <FeatureCard
          title="Factur-X intégré"
          subtitle="Conforme à la loi du 1ᵉʳ septembre 2026."
          icon={<IconFile />}
          appearFrame={32}
        />
        <FeatureCard
          title="Mentions légales auto"
          subtitle="Art. 293 B CGI, pénalités de retard, médiateur conso."
          icon={<IconScale />}
          appearFrame={40}
        />
        <FeatureCard
          title="Export comptable"
          subtitle="Excel et PDF/A-3 prêts pour ton comptable."
          icon={<IconChart />}
          appearFrame={48}
        />
      </div>
    </AbsoluteFill>
  );
};
