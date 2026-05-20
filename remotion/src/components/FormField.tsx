/**
 * FormField — champ d'un formulaire avec effet de typing.
 *
 * La valeur se révèle de gauche à droite via `clip-path inset()`,
 * interpolée frame par frame. Un caret bleu accent clignote pendant
 * la frappe (toggle 2 fois par seconde via le modulo de la frame).
 *
 * Les props `startFrame` et `endFrame` définissent la fenêtre de
 * typing dans le contexte LOCAL de la scène (donc 0 = début de la
 * Sequence parent).
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";

interface FormFieldProps {
  label: string;
  value: string;
  /** Frame locale où le typing commence */
  startFrame: number;
  /** Frame locale où le typing se termine (valeur entièrement visible) */
  endFrame: number;
  /** Couleur d'accent (non utilisée pour le caret depuis qu'il est retiré,
   *  gardée comme prop optionnelle au cas où on en aurait besoin pour
   *  d'autres éléments du champ — par exemple un focus ring). */
  accent?: string;
  /** Si true, ajoute un tick vert d'autocomplete à la fin */
  withCheck?: boolean;
  /** Si true, applique tabular-nums + font-medium (pour montants) */
  mono?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  startFrame,
  endFrame,
  // Le paramètre `accent` reste accepté pour la rétrocompatibilité des
  // appels existants, mais n'est plus utilisé visuellement (le caret
  // clignotant a été retiré — cf. demande user 20/05/2026).
  accent: _accent,
  withCheck = false,
  mono = false,
}) => {
  const frame = useCurrentFrame();

  // Progression du typing : 0 avant startFrame, 1 après endFrame
  const typingProgress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // clip-path inset(top right bottom left) — on cache la droite
  // (100% - progress * 100%) du span
  const clipRight = (1 - typingProgress) * 100;

  // Tick d'autocomplete : apparaît juste après la fin du typing
  const tickOpacity = withCheck
    ? interpolate(frame, [endFrame + 3, endFrame + 9], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const tickScale = withCheck
    ? interpolate(frame, [endFrame + 3, endFrame + 9], [0.5, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div style={{ fontFamily: FONTS.sans }}>
      <div
        style={{
          fontSize: 19,
          fontWeight: 500,
          color: COLORS.ink3,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 14,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: "relative",
          height: 84,
          // Bg gris page (#F4F5F7) + bordure 1.5px divider pour bien
          // signaler "zone de saisie" — sinon à l'échelle vidéo le
          // contraste surface2/surface devient quasi imperceptible.
          background: COLORS.pageBg,
          border: `1.5px solid ${COLORS.divider}`,
          borderRadius: 16,
          padding: "0 26px",
          display: "flex",
          alignItems: "center",
          fontSize: 28,
          color: COLORS.ink1,
          overflow: "hidden",
        }}
      >
        {/* Valeur "tapée" — révélée de gauche à droite via clip-path */}
        <span
          style={{
            display: "inline-block",
            clipPath: `inset(0 ${clipRight}% 0 0)`,
            fontVariantNumeric: mono ? "tabular-nums" : "normal",
            fontWeight: mono ? 500 : 400,
          }}
        >
          {value}
        </span>

        {/* Tick d'autocomplete (Client) */}
        {withCheck && (
          <span
            aria-hidden
            style={{
              marginLeft: "auto",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              color: COLORS.success,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              opacity: tickOpacity,
              transform: `scale(${tickScale})`,
            }}
          >
            ✓
          </span>
        )}
      </div>
    </div>
  );
};
