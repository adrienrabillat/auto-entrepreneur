"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Check } from "lucide-react";
import { ACCENTS, DEFAULT_ACCENT, isAccentId, type AccentId } from "@/lib/themes";

type Theme = "light" | "dark";

/**
 * Panneau Thèmes : toggle clair/sombre + rangée de 6 accents colorés.
 * Sauvegarde en localStorage (ae-theme / ae-accent) et applique directement
 * sur <html> via data-theme / data-accent. Le bootstrap dans app/layout.tsx
 * les applique AVANT le premier paint pour éviter le flash.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    const savedAccent = typeof window !== "undefined" ? localStorage.getItem("ae-accent") : null;
    setAccent(isAccentId(savedAccent) ? savedAccent : DEFAULT_ACCENT);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem("ae-theme", next);
    } catch {
      /* storage off — fallback session */
    }
  }

  function pickAccent(id: AccentId) {
    setAccent(id);
    if (id === "blue") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", id);
    try {
      localStorage.setItem("ae-accent", id);
    } catch {
      /* storage off */
    }
  }

  const isDark = theme === "dark";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Row des accents — clic direct pour changer */}
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Couleur d'accent">
        {ACCENTS.map((a) => {
          const selected = accent === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Accent ${a.name}`}
              title={a.name}
              onClick={() => pickAccent(a.id)}
              className={
                "relative h-8 w-8 rounded-full transition-transform duration-150 shadow-hair " +
                (selected ? "scale-110 ring-2 ring-offset-2 ring-ink-400 ring-offset-surface" : "hover:scale-105")
              }
              style={{ backgroundColor: a.preview }}
            >
              {selected ? (
                <Check
                  size={14}
                  className="absolute inset-0 m-auto text-white drop-shadow"
                  strokeWidth={3}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Toggle clair / sombre */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
        className="relative h-8 w-14 shrink-0 rounded-full transition-colors bg-surface-2 shadow-hair"
      >
        <span
          className={
            "absolute top-1 h-6 w-6 rounded-full shadow-hair grid place-items-center transition-transform duration-200 ease-out " +
            (isDark
              ? "translate-x-[1.625rem] bg-brand-500 text-white"
              : "translate-x-1 bg-surface text-ink-500")
          }
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </span>
      </button>
    </div>
  );
}
