"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroAmount — chiffre principal du dashboard avec animation count-up
 * (easeOutCubic sur 900ms). Accessibilité : si l'utilisateur a activé
 * « Reduce motion », on affiche la valeur finale directement sans anim.
 */
export function HeroAmount({ cents }: { cents: number }) {
  const final = Math.max(0, Math.floor(cents));
  const [value, setValue] = useState<number>(() => {
    if (typeof window === "undefined") return final;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return prefersReduced ? final : 0;
  });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || final === 0) {
      setValue(final);
      return;
    }
    const start = performance.now();
    const dur = 900;
    const from = 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (final - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [final]);

  const euros = Math.floor(value / 100);
  const decimals = String(final % 100).padStart(2, "0");
  const formatted = euros.toLocaleString("fr-FR").replace(/\s/g, "\u2009");

  return (
    <div
      className="mt-2 flex items-baseline gap-1 font-bold tabular-nums tracking-[-0.035em] leading-none text-ink-900"
      style={{ fontSize: "clamp(48px, 7vw, 72px)" }}
    >
      <span className="text-ink-500 font-medium" style={{ fontSize: "0.55em" }}>
        €
      </span>
      <span>{formatted}</span>
      <span className="text-ink-500 font-medium" style={{ fontSize: "0.55em" }}>
        ,{decimals}
      </span>
    </div>
  );
}
