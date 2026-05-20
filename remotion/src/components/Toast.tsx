/**
 * Toast — notification verte qui slide depuis le bas pendant la scène
 * SendInvoice. Deux instances utilisées : "Facture envoyée" puis
 * "URSSAF déclarée".
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../tokens";
import { outExpo } from "../utils/easings";

interface ToastProps {
  icon: "send" | "check" | "shield";
  title: string;
  subtitle?: string;
  /** Frame locale où le toast commence à entrer */
  enterFrame: number;
  /** Frame locale où il commence à sortir (optionnel) */
  exitFrame?: number;
}

const Icon: React.FC<{ kind: ToastProps["icon"] }> = ({ kind }) => {
  const stroke = COLORS.success;
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "send") {
    return (
      <svg {...common}>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg {...common} strokeWidth={2.8}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
};

export const Toast: React.FC<ToastProps> = ({
  icon,
  title,
  subtitle,
  enterFrame,
  exitFrame,
}) => {
  const frame = useCurrentFrame();

  // Slide-up depuis 80px en-dessous + fade-in
  const translateY = interpolate(
    frame,
    [enterFrame, enterFrame + 12],
    [80, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: outExpo,
    },
  );
  const enterOpacity = interpolate(
    frame,
    [enterFrame, enterFrame + 8],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Fade-out optionnel
  const exitOpacity = exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 10], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const opacity = Math.min(enterOpacity, exitOpacity);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 22px",
        background: "#FFFFFF",
        border: `1px solid ${COLORS.divider}`,
        borderRadius: 999,
        boxShadow: "0 8px 28px rgba(11,13,18,0.12)",
        fontFamily: FONTS.sans,
        transform: `translateY(${translateY}px)`,
        opacity,
        maxWidth: 900,
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "rgba(18, 168, 104, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon kind={icon} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: COLORS.ink1,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 14,
              color: COLORS.ink3,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
