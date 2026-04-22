import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "neutral" | "success" | "warn";
}) {
  const accentClass =
    accent === "success" ? "text-success-600" : accent === "warn" ? "text-warn-600" : "text-ink-900";
  return (
    <div className="surface p-5">
      <div className="text-small text-ink-500">{label}</div>
      <div className={cn("mt-1 text-h1 tabular-nums", accentClass)}>{value}</div>
      {hint ? <div className="mt-1 text-small text-ink-500">{hint}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const toneMap = {
    neutral: "bg-ink-100 text-ink-700",
    success: "bg-success-50 text-success-600",
    warn: "bg-warn-50 text-warn-600",
    danger: "bg-danger-50 text-danger-600",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", toneMap[tone])}>
      {children}
    </span>
  );
}
