/**
 * ThemePicker — les 5 pastilles colorées affichées dans le header de
 * l'app pendant la scène ColorStory. La pastille active reçoit un
 * ring (anneau) en plus.
 *
 * Les positions x/y de chaque pastille sont exposées via la prop
 * `onLayout` (callback synchrone) pour que la scène parent puisse
 * calculer où envoyer le curseur souris. Cela évite de hardcoder les
 * positions dans plusieurs endroits.
 */
import React from "react";
import { COLORS, AccentName } from "../tokens";

const ACCENT_ORDER: AccentName[] = [
  "blue",
  "purple",
  "pink",
  "orange",
  "green",
];

interface ThemePickerProps {
  /** Couleur actuellement active (sera entourée d'un ring) */
  activeAccent: AccentName;
  /** Si true, on tracte les positions (debug) */
  showLabels?: boolean;
}

/** Centre x d'une pastille (en pixels, relatif au header) */
export function pickerPillX(index: number, baseX: number, spacing: number) {
  return baseX + index * spacing;
}

export const PICKER_BASE_X = 760; // px depuis la gauche du frame 1080
export const PICKER_Y = 50; // px depuis le haut du frame
export const PICKER_SPACING = 56; // distance entre 2 pastilles
export const PICKER_SIZE = 36; // diamètre

/** Position absolue (centre) de la pastille `index` dans le canvas */
export function pillCenter(index: number): { x: number; y: number } {
  return {
    x: PICKER_BASE_X + index * PICKER_SPACING + PICKER_SIZE / 2,
    y: PICKER_Y + PICKER_SIZE / 2,
  };
}

export const ThemePicker: React.FC<ThemePickerProps> = ({
  activeAccent,
  showLabels = false,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: PICKER_BASE_X,
        top: PICKER_Y,
        display: "flex",
        gap: PICKER_SPACING - PICKER_SIZE,
        alignItems: "center",
      }}
    >
      {ACCENT_ORDER.map((name) => {
        const isActive = name === activeAccent;
        const color = COLORS.accents[name].hex;
        return (
          <div
            key={name}
            style={{
              position: "relative",
              width: PICKER_SIZE,
              height: PICKER_SIZE,
              borderRadius: "50%",
              background: color,
              boxShadow: isActive
                ? `0 0 0 4px rgb(255,255,255), 0 0 0 6px ${color}, 0 2px 8px rgba(11,13,18,0.18)`
                : "0 2px 6px rgba(11,13,18,0.12)",
              transition: "box-shadow 0.15s",
            }}
          >
            {showLabels && (
              <span
                style={{
                  position: "absolute",
                  top: PICKER_SIZE + 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10,
                  color: "rgb(138,143,156)",
                }}
              >
                {name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
