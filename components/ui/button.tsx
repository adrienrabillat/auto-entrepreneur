import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98]";

const variants: Record<Variant, string> = {
  // Primary: vivid gradient — text must stay white.
  primary:
    "bg-brand-gradient text-white shadow-pop hover:shadow-glow hover:brightness-[1.05]",
  // Secondary: white pill with hairline border
  secondary:
    "bg-white text-ink-800 shadow-hair hover:bg-ink-50 hover:shadow-soft",
  // Ghost: no bg, for inline controls
  ghost: "text-ink-700 hover:bg-ink-100",
  // Danger: solid red
  danger: "bg-danger-500 text-white hover:bg-danger-600",
  // Outline: transparent bg with brand border
  outline:
    "bg-white text-brand-600 ring-1 ring-inset ring-brand-200 hover:bg-brand-50",
};

const sizes: Record<Size, string> = {
  // Mobile-friendly heights (≥40px tap targets on md+)
  sm: "h-9 px-3.5 text-small rounded-lg",
  md: "h-11 px-5 text-small rounded-xl",
  lg: "h-12 px-6 text-body rounded-xl",
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
