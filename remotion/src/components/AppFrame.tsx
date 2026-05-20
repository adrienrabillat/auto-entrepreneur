/**
 * AppFrame — le "chrome" de fenêtre macOS (dots + URL bar).
 * Encadre toutes les scènes pour donner l'impression d'une vraie app
 * web Asthia.
 */
import React from "react";
import { COLORS, FONTS } from "../tokens";

interface AppFrameProps {
  /** Texte affiché dans la barre d'URL — change selon la scène */
  url: string;
  children: React.ReactNode;
}

export const AppFrame: React.FC<AppFrameProps> = ({ url, children }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.surface,
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: FONTS.sans,
      }}
    >
      {/* Bandeau macOS : 3 dots à gauche + URL au centre */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 40px",
          borderBottom: `1.5px solid ${COLORS.divider}`,
          background: COLORS.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: COLORS.divider,
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: COLORS.divider,
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: COLORS.divider,
              display: "inline-block",
            }}
          />
        </div>

        <span
          style={{
            fontSize: 26,
            color: COLORS.ink3,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 500,
          }}
        >
          {url}
        </span>

        {/* Spacer symétrique pour que l'URL reste centrée */}
        <span style={{ width: 90 }} />
      </div>

      {/* Contenu de la scène */}
      <div
        style={{
          flex: 1,
          position: "relative",
          background: COLORS.surface,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};
