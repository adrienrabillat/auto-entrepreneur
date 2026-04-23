import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

/**
 * Bouton — style Revolut : pill arrondie full, accent bleu rempli pour le
 * primaire, ghost léger sur fond surface-2 pour le secondaire.
 * - La variante `primary` pose une ombre portée colorée (shadow-pop).
 * - Toutes les tailles sont en radius-full pour garder l'aspect pill.
 */
const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page " +
  "active:scale-[0.98] hover:-translate-y-[1px]";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-pop hover:brightness-[1.05]",
  secondary:
    "bg-surface-2 text-ink-900 hover:bg-brand-500/10 hover:text-brand-600",
  ghost:
    "text-ink-700 hover:bg-surface-2",
  danger:
    "bg-danger-500 text-white hover:brightness-[1.05]",
  outline:
    "bg-transparent text-brand-600 ring-1 ring-inset ring-brand-500/30 hover:bg-brand-500/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-small rounded-full",
  md: "h-11 px-5 text-small rounded-full",
  lg: "h-12 px-6 text-body rounded-full",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
