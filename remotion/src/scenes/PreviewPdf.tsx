/**
 * Scène 3 — PreviewPdf (0:09 → 0:14, 150 frames à 30 fps)
 *
 * La facture créée à l'écran précédent est maintenant prévisualisée
 * sous forme PDF prêt à envoyer, fidèle au PDF généré par lib/pdf.ts
 * (palette monochrome navy/noir/gris, layout typographique).
 *
 * Timing (frames locales, version étalée 20s) :
 *   f=0-16       Slide-up + fade-in du PDF (cascade démarre à f=4)
 *   f=16-115     PDF stable, on lit (99f = 3.3s pour parcourir la facture)
 *   f=115-130    Curseur descend vers "Envoyer au client"
 *   f=130        Clic (pulse bouton)
 *   f=130-150    Hold avant transition vers scène 4
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { Cursor, Waypoint } from "../components/Cursor";
import { InvoicePdf } from "../components/InvoicePdf";
import { COLORS, FONTS } from "../tokens";

const ACCENT = COLORS.accents.blue.hex;
const ACCENT_RGB = COLORS.accents.blue.rgb;
const ACCENT_SOFT = `rgba(${ACCENT_RGB[0]}, ${ACCENT_RGB[1]}, ${ACCENT_RGB[2]}, 0.18)`;

export const PreviewPdf: React.FC = () => {
  const frame = useCurrentFrame();

  // Pas de fade-in / slide-in interne : l'entrée est gérée par la
  // TransitionSeries du Hero (slide-from-bottom depuis CreateInvoice).

  // Pulse bouton "Envoyer au client" autour de f=130
  const btnScale = interpolate(
    frame,
    [128, 130, 133, 137],
    [1, 0.96, 1.02, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Coordonnées curseur en pixels du canvas 1620×1800.
  // Bouton centré (x=810) en bas (y≈1640).
  const cursorWaypoints: Waypoint[] = [
    { frame: 108, x: 1480, y: 150 },
    { frame: 128, x: 810, y: 1640, click: true },
    { frame: 130, x: 810, y: 1640, click: true },
    { frame: 150, x: 810, y: 1640 },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.pageBg }}>
      <AppFrame url="asthia.app / factures / nouvelle / aperçu">
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "40px 60px 220px 60px",
            fontFamily: FONTS.sans,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 600,
                color: COLORS.ink1,
                letterSpacing: "-0.01em",
              }}
            >
              Aperçu de la facture
            </div>
            <div style={{ fontSize: 20, color: COLORS.ink3 }}>
              prête à envoyer
            </div>
          </div>

          <InvoicePdf cascadeStartFrame={4} />
        </div>

        {/* Bouton Envoyer — centré, plus gros */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 80,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "28px 64px",
              borderRadius: 999,
              background: ACCENT,
              color: "white",
              fontSize: 26,
              fontWeight: 600,
              fontFamily: FONTS.sans,
              boxShadow: `0 16px 40px ${ACCENT_SOFT}`,
              transform: `scale(${btnScale})`,
              transformOrigin: "center",
            }}
          >
            Envoyer au client
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>

        <Cursor waypoints={cursorWaypoints} visibleFrom={106} size={56} />
      </AppFrame>
    </AbsoluteFill>
  );
};
