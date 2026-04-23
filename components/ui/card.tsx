import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Carte principale — fond surface, radius 24px, ombre douce, sans bordure.
 * Utilisée partout comme conteneur de section (dashboard, settings, etc.).
 */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("surface p-5 md:p-7", className)}>{children}</div>;
}

/**
 * StatCard — carte compacte pour un chiffre clé.
 * Design Revolut : label avec dot coloré, valeur 28px bold, hint optionnel.
 */
export function StatCard({
  label,
  value,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "brand" | "success" | "warn" | "danger" | "neutral";
}) {
  const dotBg = {
    brand:   "bg-brand-500",
    success: "bg-success-500",
    warn:    "bg-warn-500",
    danger:  "bg-danger-500",
    neutral: "bg-ink-400",
  } as const;

  return (
    <div className="surface p-5 md:p-6">
      <div className="flex items-center gap-2 text-small text-ink-500">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotBg[accent])} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-2xl md:text-[28px] font-bold tabular-nums tracking-tight text-ink-900">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
    </div>
  );
}

/**
 * Badge — rétro-compat : on rend désormais un dot + texte neutre (style Revolut).
 * L'API reste identique pour ne pas casser les pages pas encore refondues.
 */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "brand";
}) {
  const toneToStatus: Record<string, string> = {
    success: "paid",
    warn: "sent",
    danger: "cancel",
    brand: "paid", // accent positif
    neutral: "draft",
  };
  return (
    <span className={cn("status-dot", toneToStatus[tone] ?? "draft")}>
      <span className="d" aria-hidden />
      {children}
    </span>
  );
}
