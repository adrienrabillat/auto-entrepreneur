/**
 * Cursor — curseur souris SVG style macOS qui suit une série de
 * waypoints dans le temps.
 *
 * Chaque waypoint définit une position (x, y) à atteindre à une
 * frame donnée. Entre deux waypoints, la position est interpolée
 * avec un easing out-expo (démarre vif, ralentit en arrivant à
 * destination) — un curseur humain ne se déplace pas linéairement.
 *
 * Quand `click: true` est défini sur un waypoint, le curseur fait un
 * scale-down rapide (0.85) sur 2-3 frames autour de la frame du clic.
 *
 * Le curseur peut aussi être complètement masqué via `visibleFrom` /
 * `visibleUntil` (utile pour ne pas l'afficher pendant les
 * transitions de scène).
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { outExpo } from "../utils/easings";

export interface Waypoint {
  /** Frame à laquelle le curseur doit être à cette position */
  frame: number;
  /** Position en pixels dans le canvas (origine top-left) */
  x: number;
  y: number;
  /** Si true, le curseur "clique" autour de cette frame */
  click?: boolean;
}

interface CursorProps {
  waypoints: Waypoint[];
  /** Frame à partir de laquelle le curseur est visible (défaut : 0) */
  visibleFrom?: number;
  /** Frame jusqu'à laquelle le curseur reste visible (défaut : durée scène) */
  visibleUntil?: number;
  /** Taille du curseur en pixels (défaut : 36) */
  size?: number;
}

export const Cursor: React.FC<CursorProps> = ({
  waypoints,
  visibleFrom = 0,
  visibleUntil = 9999,
  size = 36,
}) => {
  const frame = useCurrentFrame();

  // Avant le premier waypoint ou après le dernier : positions clamp
  if (waypoints.length === 0) return null;

  // Trouve les deux waypoints encadrant la frame courante
  let prev = waypoints[0];
  let next = waypoints[waypoints.length - 1];
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (frame >= waypoints[i].frame && frame <= waypoints[i + 1].frame) {
      prev = waypoints[i];
      next = waypoints[i + 1];
      break;
    }
  }
  if (frame < waypoints[0].frame) {
    prev = waypoints[0];
    next = waypoints[0];
  } else if (frame > waypoints[waypoints.length - 1].frame) {
    prev = waypoints[waypoints.length - 1];
    next = waypoints[waypoints.length - 1];
  }

  // Position interpolée entre prev et next avec easing out-expo
  const x =
    prev.frame === next.frame
      ? prev.x
      : interpolate(frame, [prev.frame, next.frame], [prev.x, next.x], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: outExpo,
        });
  const y =
    prev.frame === next.frame
      ? prev.y
      : interpolate(frame, [prev.frame, next.frame], [prev.y, next.y], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: outExpo,
        });

  // Click pulse : scale 1 → 0.85 → 1 sur 4 frames autour du waypoint.click
  let scale = 1;
  for (const wp of waypoints) {
    if (!wp.click) continue;
    const offset = frame - wp.frame;
    if (offset >= -1 && offset <= 3) {
      // -1 à 3 : scale-down brièvement
      scale = interpolate(
        Math.abs(offset),
        [0, 1, 3],
        [0.85, 0.92, 1],
        { extrapolateRight: "clamp" },
      );
    }
  }

  // Visibilité : fade in/out sur 4 frames aux extrémités
  let opacity = 1;
  if (frame < visibleFrom) {
    opacity = 0;
  } else if (frame > visibleUntil) {
    opacity = 0;
  } else if (frame < visibleFrom + 4) {
    opacity = (frame - visibleFrom) / 4;
  } else if (frame > visibleUntil - 4) {
    opacity = (visibleUntil - frame) / 4;
  }

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ filter: "drop-shadow(0 3px 6px rgba(11,13,18,0.32))" }}
      >
        {/* Curseur "flèche" macOS — fill blanc, stroke noir */}
        <path
          d="M5.5 3.5 L5.5 17.5 L9.2 14 L11.5 19.5 L13.8 18.4 L11.5 13 L16.5 13 Z"
          fill="white"
          stroke="rgb(11, 13, 18)"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
