/**
 * Bootstrap — composition de validation du pipeline Remotion.
 *
 * Objectif : confirmer chez le user que :
 *   1. `npm install` télécharge bien Remotion + Chromium headless
 *   2. `npm start` ouvre le Studio (UI de preview à http://localhost:3000)
 *   3. L'interpolation de couleur frame-par-frame marche
 *   4. La police Inter charge correctement
 *
 * Ce que la scène montre, sur 5 secondes (150 frames à 30 fps) :
 *   - Le fond passe progressivement du bleu Asthia (#2F6BFF) au vert
 *     (#10B981) via interpolation des canaux RGB
 *   - Le mot "Asthia" est affiché en gros, blanc, Inter extrabold
 *   - Un petit HUD en bas montre le frame courant et le % de progression
 *     pour qu'on voie clairement que l'animation tourne
 *
 * Une fois cette scène validée, on supprime ce fichier et on enchaîne
 * sur les 4 scènes du Hero (Color → Form → Preview → Send).
 */
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, rgbLerp } from "./tokens";

// Charge Inter — uniquement les poids et sous-ensembles dont la
// scène a besoin, pour éviter les "Too many network requests" en
// rendu (chaque poids × chaque subset = une requête fetch côté
// Chromium). Ici : 2 poids (500 pour le HUD, 800 pour le wordmark)
// et 1 subset (latin pour le français).
const { fontFamily } = loadFont("normal", {
  weights: ["500", "800"],
  subsets: ["latin"],
});

export const Bootstrap = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Progression linéaire de 0 à 1 sur toute la durée de la scène.
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Interpolation des canaux RGB du bleu Asthia vers le vert.
  const backgroundColor = rgbLerp(
    COLORS.accents.blue.rgb,
    COLORS.accents.green.rgb,
    progress,
  );

  // Petit easing sur l'apparition du wordmark : il fade-in sur les
  // 30 premières frames (1 s) puis reste plein.
  const wordmarkOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {/* Wordmark central */}
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          opacity: wordmarkOpacity,
        }}
      >
        Asthia
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          marginTop: 16,
          opacity: wordmarkOpacity * 0.85,
        }}
      >
        Test Remotion · bleu → vert
      </div>

      {/* HUD de debug en bas — confirme que le frame avance */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 18,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.7)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>
          Frame {String(frame).padStart(3, "0")} / {durationInFrames}
        </span>
        <span>{Math.round(progress * 100)} %</span>
        <span>{backgroundColor}</span>
      </div>
    </AbsoluteFill>
  );
};
