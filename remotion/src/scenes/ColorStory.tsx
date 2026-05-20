/**
 * Scène 1 — ColorStory v2 (0:00 → 0:04, 120 frames à 30 fps)
 *
 * Version "poster" minimaliste, plus impactante que le dashboard
 * détaillé. Composition :
 *   - Fond doux légèrement teinté de l'accent courant (overlay opaque
 *     à ~10 % qui shift à chaque clic)
 *   - Titre "Choisis ton style." centré, gros gras, dont la couleur
 *     morph aussi avec l'accent
 *   - 5 grandes pastilles centrées en dessous (la pastille active a
 *     un ring)
 *   - Curseur souris qui descend et clique chaque pastille dans
 *     l'ordre bleu → violet → rose → orange → vert
 *
 * Timing (frames locales, version étalée 20s) :
 *   f=0-8        Fade-in scène depuis blanc neutre
 *   f=10-24      Curseur vers la violette
 *   f=24         Clic — accent bleu → violet (morph sur 12f)
 *   f=42         Clic — accent violet → rose
 *   f=62         Clic — accent rose → orange
 *   f=82         Clic — accent orange → vert
 *   f=82-120     Hold sur vert (38f = 1.27s) avant transition scène 2
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, Waypoint } from "../components/Cursor";
import { COLORS, AccentName, FONTS } from "../tokens";

// Le parcours part du vert et atterrit sur le bleu (le brand par défaut
// d'Asthia). Les scènes suivantes restent toutes en bleu pour rester
// cohérentes avec le brand-500 utilisé dans le reste de l'app.
const ACCENT_ORDER: AccentName[] = ["green", "orange", "pink", "purple", "blue"];

// Frames clés des clics — espacés de ~18-20f pour laisser respirer
const CLICK_FRAMES = [24, 42, 62, 82];

// Layout des pastilles : centrées horizontalement sur le canvas
// 1620×1800. 90 px de diamètre, 36 px d'espacement.
// 5 pastilles × 90 + 4 × 36 = 594 px → start_x = (1620 - 594) / 2 = 513.
const PILL_SIZE = 90;
const PILL_GAP = 36;
const CANVAS_W = 1620;
const CANVAS_H = 1800;
const PILL_TOTAL = ACCENT_ORDER.length * PILL_SIZE + (ACCENT_ORDER.length - 1) * PILL_GAP;
const PILL_START_X = (CANVAS_W - PILL_TOTAL) / 2;
const PILL_Y = 1080;

/** Centre absolu (x, y) d'une pastille */
function pillCenter(index: number) {
  return {
    x: PILL_START_X + index * (PILL_SIZE + PILL_GAP) + PILL_SIZE / 2,
    y: PILL_Y + PILL_SIZE / 2,
  };
}

/** Détermine l'accent interpolé à une frame donnée */
function getInterpolatedAccent(frame: number) {
  let fromIndex = 0;
  for (let i = 0; i < CLICK_FRAMES.length; i++) {
    if (frame < CLICK_FRAMES[i]) break;
    fromIndex = i + 1;
  }
  const toIndex = Math.min(fromIndex, ACCENT_ORDER.length - 1);

  if (frame < CLICK_FRAMES[0]) {
    const a = COLORS.accents[ACCENT_ORDER[0]];
    return {
      rgb: [...a.rgb] as [number, number, number],
      hex: a.hex,
      activeIndex: 0,
    };
  }
  const clickIdx = toIndex - 1;
  const clickFrame = CLICK_FRAMES[clickIdx];
  const from = COLORS.accents[ACCENT_ORDER[clickIdx]];
  const to = COLORS.accents[ACCENT_ORDER[clickIdx + 1]];
  const t = interpolate(frame, [clickFrame, clickFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rgb: [number, number, number] = [
    Math.round(from.rgb[0] + (to.rgb[0] - from.rgb[0]) * t),
    Math.round(from.rgb[1] + (to.rgb[1] - from.rgb[1]) * t),
    Math.round(from.rgb[2] + (to.rgb[2] - from.rgb[2]) * t),
  ];
  return {
    rgb,
    hex: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    activeIndex: t > 0.5 ? clickIdx + 1 : clickIdx,
  };
}

export const ColorStory: React.FC = () => {
  const frame = useCurrentFrame();
  const accent = getInterpolatedAccent(frame);
  const accentTint = `rgba(${accent.rgb[0]}, ${accent.rgb[1]}, ${accent.rgb[2]}, 0.08)`;

  const sceneOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Le titre se "réveille" un peu après le fond
  const titleOpacity = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [6, 18], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Le bloc de pastilles arrive juste après
  const pillsOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Waypoints du curseur — descend dans l'ordre des clics
  // Coordonnées en pixels sur le canvas 1620×1800.
  const cursorWaypoints: Waypoint[] = [
    { frame: 0, x: 1440, y: 1700 },
    { frame: 23, ...pillCenter(1), click: true },
    { frame: 41, ...pillCenter(2), click: true },
    { frame: 61, ...pillCenter(3), click: true },
    { frame: 81, ...pillCenter(4), click: true },
    { frame: 120, ...pillCenter(4) },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.pageBg,
        opacity: sceneOpacity,
        fontFamily: FONTS.sans,
      }}
    >
      {/* Overlay opaque teinté de l'accent — donne le côté "le fond
          change un peu de couleur à chaque clic". Volontairement discret
          (8 %) pour rester lisible. */}
      <AbsoluteFill style={{ background: accentTint }} />

      {/* Titre centré */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 700,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: COLORS.ink1,
          }}
        >
          Choisis{" "}
          <span style={{ color: accent.hex }}>ton style</span>
          <span style={{ color: COLORS.ink1 }}>.</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: COLORS.ink3,
            marginTop: 28,
            fontWeight: 500,
          }}
        >
          5 couleurs · 1 clic
        </div>
      </div>

      {/* Pastilles centrées */}
      <div
        style={{
          position: "absolute",
          left: PILL_START_X,
          top: PILL_Y,
          display: "flex",
          gap: PILL_GAP,
          opacity: pillsOpacity,
        }}
      >
        {ACCENT_ORDER.map((name, i) => {
          const isActive = i === accent.activeIndex;
          const color = COLORS.accents[name].hex;
          return (
            <div
              key={name}
              style={{
                width: PILL_SIZE,
                height: PILL_SIZE,
                borderRadius: "50%",
                background: color,
                boxShadow: isActive
                  ? `0 0 0 5px ${COLORS.surface}, 0 0 0 8px ${color}, 0 8px 24px rgba(11,13,18,0.18)`
                  : "0 4px 12px rgba(11,13,18,0.12)",
              }}
            />
          );
        })}
      </div>

      <Cursor waypoints={cursorWaypoints} visibleFrom={6} size={60} />
    </AbsoluteFill>
  );
};
