/**
 * InvoicePdf — fidèle au PDF réellement généré par lib/pdf.ts.
 *
 * Toutes les tailles sont calibrées pour le canvas 1620×1800 (1.5×
 * la résolution initiale), avec un padding et une typo généreux pour
 * que le document soit lisible et occupe correctement la zone vidéo.
 *
 * Structure (cf. lib/pdf.ts) :
 *   1. Bandeau en-tête sur 1 ligne : FACTURE | Asthia | Référence
 *   2. Meta line 3 colonnes (dates)
 *   3. Émetteur / Facturé à
 *   4. Tableau article
 *   5. Bloc totaux à droite
 *   6. Règlement + mentions légales
 *
 * Palette monochrome navy/noir/gris.
 *
 * Cascade : 6 blocs apparaissent l'un après l'autre (stagger ~4 frames)
 * pour donner l'impression que le PDF "se monte".
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../tokens";
import { outQuart } from "../utils/easings";

interface InvoicePdfProps {
  cascadeStartFrame: number;
}

const CASCADE_STEP = 4;

const C_INK = "rgb(15, 23, 42)";
const C_INK_900 = "rgb(4, 7, 16)";
const C_INK_700 = "rgb(50, 65, 84)";
const C_INK_500 = "rgb(100, 116, 139)";
const C_INK_400 = "rgb(148, 163, 184)";
const C_LINE = "rgb(225, 232, 240)";

function useCascadeStyle(stepIndex: number, cascadeStartFrame: number) {
  const frame = useCurrentFrame();
  const localFrame = frame - cascadeStartFrame - stepIndex * CASCADE_STEP;
  const opacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outQuart,
  });
  const translateY = interpolate(localFrame, [0, 8], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: outQuart,
  });
  return {
    opacity,
    transform: `translateY(${translateY}px)`,
  };
}

const Block: React.FC<{
  step: number;
  cascadeStartFrame: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ step, cascadeStartFrame, children, style }) => {
  const cascade = useCascadeStyle(step, cascadeStartFrame);
  return <div style={{ ...style, ...cascade }}>{children}</div>;
};

const Hr: React.FC<{ color?: string }> = ({ color = C_LINE }) => (
  <div
    style={{
      height: 1.5,
      background: color,
      width: "100%",
    }}
  />
);

export const InvoicePdf: React.FC<InvoicePdfProps> = ({
  cascadeStartFrame,
}) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        // Padding vertical généreux pour que la facture occupe plus de
        // hauteur et limite le blanc avant le bouton (cf. demande user).
        padding: "96px 90px",
        fontFamily: FONTS.sans,
        color: C_INK,
        boxShadow: "0 12px 40px rgba(11,13,18,0.08)",
        // Encadré fin mais bien visible (couleur un cran plus foncée
        // que C_LINE pour ressortir à l'échelle vidéo).
        border: "2px solid #CDD3DD",
        borderRadius: 12,
      }}
    >
      {/* 1. En-tête : FACTURE | Asthia | Référence */}
      <Block
        step={0}
        cascadeStartFrame={cascadeStartFrame}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 76,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: C_INK_900,
          }}
        >
          FACTURE
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: C_INK_900,
          }}
        >
          Asthia
        </div>
        <div
          style={{
            fontSize: 18,
            color: C_INK_500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Référence facture : 2026-0042
        </div>
      </Block>

      {/* 2. Meta line : 3 colonnes de dates */}
      <Block step={1} cascadeStartFrame={cascadeStartFrame}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 32,
            paddingBottom: 40,
          }}
        >
          {[
            { label: "DATE D'ÉMISSION", value: "15 mai 2026" },
            { label: "DATE DE RÈGLEMENT", value: "14 juin 2026" },
            { label: "DATE D'EXÉCUTION", value: "15 mai 2026" },
          ].map((m) => (
            <div key={m.label}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C_INK_400,
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: C_INK,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
        <Hr />
      </Block>

      {/* 3. Émetteur (gauche) + Facturé à (droite) */}
      <Block
        step={2}
        cascadeStartFrame={cascadeStartFrame}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          paddingTop: 60,
          paddingBottom: 60,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C_INK_400,
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}
          >
            ÉMETTEUR
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C_INK_900,
              marginBottom: 4,
            }}
          >
            Jean Dupuis · EI
          </div>
          <div
            style={{
              fontSize: 18,
              fontStyle: "italic",
              color: C_INK_700,
              marginBottom: 8,
            }}
          >
            Auto-entrepreneur
          </div>
          <div style={{ fontSize: 18, color: C_INK_700, lineHeight: 1.5 }}>
            12 rue de la République
            <br />
            69001 Lyon, France
          </div>
          <div
            style={{
              fontSize: 16,
              color: C_INK_500,
              marginTop: 10,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            SIRET 123 456 789 00012
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C_INK_400,
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}
          >
            FACTURÉ À
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C_INK_900,
              marginBottom: 6,
            }}
          >
            Dupont SARL
          </div>
          <div style={{ fontSize: 18, color: C_INK_700, lineHeight: 1.5 }}>
            42 rue de Rivoli
            <br />
            75001 Paris, France
          </div>
          <div style={{ fontSize: 16, color: C_INK_500, marginTop: 10 }}>
            contact@dupont-sarl.fr
          </div>
        </div>
      </Block>

      {/* 4. Tableau article */}
      <Block step={3} cascadeStartFrame={cascadeStartFrame}>
        <Hr />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 160px 160px",
            gap: 30,
            padding: "22px 0",
            fontSize: 13,
            fontWeight: 700,
            color: C_INK_400,
            letterSpacing: "0.08em",
          }}
        >
          <span>DESCRIPTION</span>
          <span style={{ textAlign: "right" }}>QTÉ</span>
          <span style={{ textAlign: "right" }}>PU HT</span>
          <span style={{ textAlign: "right" }}>TOTAL HT</span>
        </div>
        <Hr />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 160px 160px",
            gap: 30,
            padding: "40px 0",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 22, color: C_INK_900 }}>
            Audit conformité
          </span>
          <span
            style={{
              textAlign: "right",
              fontSize: 22,
              color: C_INK_900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            1
          </span>
          <span
            style={{
              textAlign: "right",
              fontSize: 22,
              color: C_INK_900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            850,00 €
          </span>
          <span
            style={{
              textAlign: "right",
              fontSize: 22,
              fontWeight: 700,
              color: C_INK_900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            850,00 €
          </span>
        </div>
        <Hr />
      </Block>

      {/* 5. Bloc totaux à droite */}
      <Block
        step={4}
        cascadeStartFrame={cascadeStartFrame}
        style={{ marginLeft: "auto", width: 460, paddingTop: 48 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: C_INK_500,
            marginBottom: 12,
          }}
        >
          <span>Sous-total HT</span>
          <span
            style={{
              color: C_INK_900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            850,00 €
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: C_INK_500,
            marginBottom: 16,
          }}
        >
          <span>TVA (non applicable, art. 293 B du CGI)</span>
          <span
            style={{
              color: C_INK_500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            0,00 €
          </span>
        </div>
        <Hr />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 14,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C_INK_900,
            }}
          >
            TOTAL
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: C_INK_900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            850,00 €
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 14,
            fontSize: 20,
            fontWeight: 700,
            color: C_INK,
          }}
        >
          <span>Solde dû</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>850,00 €</span>
        </div>
      </Block>

      {/* 6. Règlement + Mentions légales */}
      <Block
        step={5}
        cascadeStartFrame={cascadeStartFrame}
        style={{
          marginTop: 68,
          paddingTop: 36,
          borderTop: `1.5px solid ${C_LINE}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C_INK_400,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          RÈGLEMENT PAR VIREMENT
        </div>
        <div
          style={{
            fontSize: 17,
            color: C_INK_700,
            lineHeight: 1.6,
            fontFamily: FONTS.mono,
          }}
        >
          IBAN · FR76 1234 5678 9012 3456 7890 123
          <br />
          BIC · ABCDEFGHXXX
        </div>
        <div
          style={{
            fontSize: 14,
            color: C_INK_400,
            lineHeight: 1.5,
            marginTop: 20,
            fontStyle: "italic",
          }}
        >
          TVA non applicable, art. 293 B du CGI. En cas de retard de
          paiement : pénalité de 3 fois le taux d&apos;intérêt légal et
          indemnité forfaitaire pour frais de recouvrement de 40 €
          (art. L441-10 du Code de commerce). Escompte pour règlement
          anticipé : néant.
        </div>
      </Block>
    </div>
  );
};
