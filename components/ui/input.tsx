import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl bg-white px-4 text-body text-ink-900 shadow-hair",
        "placeholder:text-ink-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:shadow-glow",
        "disabled:bg-ink-100 disabled:text-ink-500",
        "transition-shadow",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-xl bg-white px-4 py-3 text-body text-ink-900 shadow-hair",
        "placeholder:text-ink-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:shadow-glow",
        "transition-shadow",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-small font-semibold text-ink-700 mb-1.5">
      {children}
      {hint ? <span className="ml-1.5 text-ink-500 font-normal">· {hint}</span> : null}
    </label>
  );
}
