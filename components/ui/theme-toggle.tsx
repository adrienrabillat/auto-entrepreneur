"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Toggle thème clair / sombre. La valeur choisie est persistée dans
 * localStorage (`ae-theme`) et appliquée via l'attribut `data-theme`
 * sur <html>. Le script de bootstrap dans app/layout.tsx applique la
 * valeur avant le premier paint pour éviter tout flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("ae-theme", next);
    } catch {
      /* storage indisponible (mode privé Safari, etc.) — on s'en remet à la session */
    }
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      className={[
        "relative h-8 w-14 shrink-0 rounded-full transition-colors",
        "bg-surface-2 shadow-hair",
        className ?? "",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1 h-6 w-6 rounded-full shadow-hair grid place-items-center",
          "transition-transform duration-200 ease-out",
          isDark
            ? "translate-x-[1.625rem] bg-brand-500 text-white"
            : "translate-x-1 bg-surface text-ink-500",
        ].join(" ")}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
}
