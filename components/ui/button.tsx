import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-1 focus-visible:ring-offset-ink-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "bg-white text-ink-700 shadow-hair hover:bg-ink-100",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-danger-600 text-white hover:bg-danger-600/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small rounded-md",
  md: "h-9 px-4 text-small rounded-md",
  lg: "h-10 px-5 text-body rounded-lg",
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
