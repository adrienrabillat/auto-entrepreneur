/**
 * Scène 2 — CreateInvoice (0:04 → 0:09, 150 frames à 30 fps)
 *
 * Maintenant en accent BLEU (le user a fini la scène 1 sur cette
 * couleur — c'est le brand par défaut d'Asthia). On affiche la page
 * "Nouvelle facture" et le formulaire se remplit champ par champ
 * avec un effet de typing.
 *
 * Timing (frames locales, version étalée 20s) :
 *   f=0-12       Slide-in de la page depuis la droite
 *   f=16-52      Typing Client : "Dupont SARL" (36f, lent et confortable)
 *   f=58-102     Typing Désignation : "Audit conformité" (44f)
 *   f=108-128    Typing Montant : "850,00 €" (20f)
 *   f=130-142    Curseur descend vers "Créer la facture"
 *   f=142        Clic (pulse sur bouton)
 *   f=142-150    Hold avant transition vers scène 3
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { Cursor, Waypoint } from "../components/Cursor";
import { FormField } from "../components/FormField";
import { COLORS, FONTS } from "../tokens";

const ACCENT = COLORS.accents.blue.hex;
const ACCENT_RGB = COLORS.accents.blue.rgb;
const ACCENT_SOFT = `rgba(${ACCENT_RGB[0]}, ${ACCENT_RGB[1]}, ${ACCENT_RGB[2]}, 0.18)`;

export const CreateInvoice: React.FC = () => {
  const frame = useCurrentFrame();

  // Pas de fade-in / slide-in interne : l'entrée de la scène est gérée
  // par la TransitionSeries du Hero (slide-from-right depuis ColorStory).

  // Pulse du bouton "Créer la facture" autour de f=142 (clic curseur)
  const btnScale = interpolate(
    frame,
    [140, 142, 145, 149],
    [1, 0.96, 1.02, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Waypoints du curseur — il commence hors-écran en haut-droite,
  // descend vers le bouton, et clique à f=142.
  // Coordonnées sur canvas 1620×1800, bouton centré (x=810) en bas (~1635).
  const cursorWaypoints: Waypoint[] = [
    { frame: 120, x: 1480, y: 150 },
    { frame: 140, x: 810, y: 1635, click: true },
    { frame: 142, x: 810, y: 1635, click: true },
    { frame: 150, x: 810, y: 1635 },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.pageBg }}>
      <AppFrame url="asthia.app / factures / nouvelle">
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "0 100px 240px 100px",
            fontFamily: FONTS.sans,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Header de la page */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 56,
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: COLORS.ink1,
                letterSpacing: "-0.025em",
              }}
            >
              Nouvelle facture
            </div>
            <div
              style={{
                fontSize: 22,
                color: COLORS.ink3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              #2026-042
            </div>
          </div>

          {/* Les 3 champs avec plus d'espace entre eux */}
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <FormField
              label="Client"
              value="Dupont SARL"
              startFrame={16}
              endFrame={52}
              accent={ACCENT}
              withCheck
            />
            <FormField
              label="Désignation"
              value="Audit conformité"
              startFrame={58}
              endFrame={102}
              accent={ACCENT}
            />
            <FormField
              label="Montant HT"
              value="850,00 €"
              startFrame={108}
              endFrame={128}
              accent={ACCENT}
              mono
            />
          </div>
        </div>

        {/* Bouton "Créer la facture" — vraiment centré (pas full-width)
            et bien plus visible. Wrapper full-width pour faciliter le
            centrage, mais le bouton lui-même est en inline-flex. */}
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
            Créer la facture
            <span style={{ fontSize: 28 }}>→</span>
          </div>
        </div>

        <Cursor waypoints={cursorWaypoints} visibleFrom={118} size={56} />
      </AppFrame>
    </AbsoluteFill>
  );
};
