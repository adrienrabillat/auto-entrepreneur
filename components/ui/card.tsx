import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("surface p-5 md:p-6", className)}>{children}</div>;
}

/**
 * StatCard — a colorful numeric card with an emoji/icon slot and a subtle
 * tinted background so the dashboard feels alive rather than academic.
 */
export function StatCard({
  label,
  value,
  hint,
  accent = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "neutral" | "success" | "warn" | "brand";
  icon?: React.ReactNode;
}) {
  const tint = {
    neutral: "bg-white",
    success: "bg-gradient-to-br from-success-50 to-white",
    warn: "bg-gradient-to-br from-warn-50 to-white",
    brand: "bg-gradient-to-br from-brand-50 to-white",
  } as const;
  const valueColor = {
    neutral: "text-ink-900",
    success: "text-success-600",
    warn: "text-warn-600",
    brand: "text-brand-700",
  } as const;
  const iconBg = {
    neutral: "bg-ink-100 text-ink-600",
    success: "bg-success-100 text-success-600",
    warn: "bg-warn-100 text-warn-600",
    brand: "bg-brand-100 text-brand-700",
  } as const;
  return (
    <div className={cn("surface p-5 md:p-6", tint[accent])}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className={cn("grid h-8 w-8 place-items-center rounded-lg", iconBg[accent])}>
            {icon}
          </div>
        ) : null}
        <div className="text-small font-medium text-ink-500">{label}</div>
      </div>
      <div className={cn("mt-3 text-h1 tabular-nums", valueColor[accent])}>{value}</div>
      {hint ? <div className="mt-1 text-small text-ink-500">{hint}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "brand";
}) {
  const toneMap = {
    neutral: "bg-ink-100 text-ink-700 ring-ink-200",
    success: "bg-success-50 text-success-600 ring-success-100",
    warn: "bg-warn-50 text-warn-600 ring-warn-100",
    danger: "bg-danger-50 text-danger-600 ring-danger-100",
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneMap[tone]
      )}
    >
      {children}
    </span>
  );
}
