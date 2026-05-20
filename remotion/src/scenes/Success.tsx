/**
 * Scène 4 — Success (0:14 → 0:17, 90 frames à 30 fps)
 *
 * Reprend le pattern visuel du composant SuccessOverlay déjà utilisé
 * dans l'app Asthia (components/ui/success-overlay.tsx) :
 *
 *   - Fond page clair, plein écran
 *   - Card surface centrée (max-width ~520 px), padding généreux
 *   - Gros cercle bleu accent 96 px avec checkmark blanc qui scale-in
 *     avec un easing cubic-bezier(.34, 1.56, .64, 1) (bounce léger)
 *   - Titre h2 "Facture envoyée"
 *   - Sous-titre small "N° 2026-042"
 *   - Bloc surface-2 avec rows Client / Montant / Statut
 *   - CTA bleu plein "Voir la facture →"
 *
 * Plus d'avion en papier, plus de toasts au bas — on garde l'esprit
 * "Asthia native" exactement comme dans l'app.
 *
 * Timing (frames locales, cycle 90f — version étalée 20s) :
 *   f=0-10       Fade-in du fond + card
 *   f=6-26       Checkmark scale-in (bounce)
 *   f=18-30      Titre + sous-titre fade-in
 *   f=28-56      Rows en cascade (stagger 5f)
 *   f=56-66      CTA fade-in
 *   f=66-90      Hold (24f = 0.8s) avant transition vers scène 5
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";
import { outQuart } from "../utils/easings";

// Bounce de l'app Asthia (success-overlay.tsx) : cubic-bezier(.34,1.56,.64,1)
const BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);

// L'accent reste BLEU pour le check, même si on est en thème vert depuis
// la scène 1 — c'est la couleur du brand-500 d'Asthia (cf. login-button,
// SuccessOverlay, etc. qui utilisent toujours brand-500 indépendamment
// de l'accent thème). Si tu veux le faire varier, on échangera plus tard.
const BRAND = COLORS.accents.blue.hex;
const BRAND_RGB = COLORS.accents.blue.rgb;
const BRAND_SOFT = `rgba(${BRAND_RGB[0]}, ${BRAND_RGB[1]}, ${BRAND_RGB[2]}, 0.18)`;

interface RowProps {
  label: string;
  value: string;
  sub?: string;
  appearFrame: number;
}

const Row: React.FC<RowProps> = ({ label, value, sub, appearFrame }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [appearFrame, appearFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outQuart,
  });
  const translateY = interpolate(
    frame,
    [appearFrame, appearFrame + 8],
    [6, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: outQuart,
    },
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
        padding: "20px 0",
        borderBottom: `1px solid ${COLORS.divider}`,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <span style={{ fontSize: 22, color: COLORS.ink3 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 500, color: COLORS.ink1, textAlign: "right" }}>
        {value}
        {sub && (
          <span
            style={{
              display: "block",
              fontSize: 17,
              fontWeight: 400,
              color: COLORS.ink3,
              marginTop: 4,
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  );
};

export const Success: React.FC = () => {
  const frame = useCurrentFrame();

  // Pas de fade-in interne : l'entrée de la scène est gérée par la
  // TransitionSeries du Hero (fondu depuis PreviewPdf).

  // Checkmark scale-in avec bounce — 0 → 1 sur 20 frames, démarre à f=6
  const checkScale = interpolate(frame, [6, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: BOUNCE,
  });

  // Titre et sous-titre fade in après le check
  const titleOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [18, 30], [6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outQuart,
  });

  // CTA fade in
  const ctaOpacity = interpolate(frame, [56, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.sans,
      }}
    >
      <div
        style={{
          width: 1080,
          background: COLORS.surface,
          borderRadius: 36,
          padding: 80,
          textAlign: "center",
          boxShadow: "0 2px 4px rgba(10,13,30,0.04), 0 16px 48px rgba(10,13,30,0.08)",
          border: `1.5px solid ${COLORS.divider}`,
        }}
      >
        {/* Cercle bleu avec checkmark */}
        <div
          style={{
            margin: "0 auto",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: BRAND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: `0 12px 36px ${BRAND_SOFT}`,
            transform: `scale(${checkScale})`,
          }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Titre + sous-titre */}
        <h2
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: COLORS.ink1,
            margin: "40px 0 0 0",
            letterSpacing: "-0.025em",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Facture envoyée
        </h2>
        <p
          style={{
            fontSize: 24,
            color: COLORS.ink3,
            margin: "12px 0 0 0",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          N° 2026-0042
        </p>

        {/* Bloc info rows */}
        <div
          style={{
            marginTop: 44,
            padding: "12px 32px",
            borderRadius: 24,
            background: COLORS.surface2,
            textAlign: "left",
          }}
        >
          <Row
            label="Client"
            value="Dupont SARL"
            sub="contact@dupont-sarl.fr"
            appearFrame={32}
          />
          <Row label="Montant" value="850,00 €" appearFrame={40} />
          <Row label="Statut" value="Envoyée" appearFrame={48} />
        </div>

        {/* CTA "Voir la facture" */}
        <div
          style={{
            marginTop: 44,
            opacity: ctaOpacity,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "24px 56px",
              borderRadius: 999,
              background: BRAND,
              color: "white",
              fontSize: 24,
              fontWeight: 500,
              boxShadow: `0 16px 40px ${BRAND_SOFT}`,
            }}
          >
            Voir la facture
            <span style={{ fontSize: 26 }}>→</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
