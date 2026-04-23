import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Input — fond surface, focus ring accent diffus, aucune bordure dure.
 * La classe shadow-hair donne une ombre portée millimétrique qui remplace
 * la bordure grise classique, cohérent avec le reste du design Revolut.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl bg-surface px-4 text-body text-ink-900 shadow-hair",
        "placeholder:text-ink-400",
        "focus:outline-none focus:shadow-glow",
        "disabled:bg-surface-2 disabled:text-ink-500",
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
        "w-full rounded-xl bg-surface px-4 py-3 text-body text-ink-900 shadow-hair",
        "placeholder:text-ink-400",
        "focus:outline-none focus:shadow-glow",
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
    <label htmlFor={htmlFor} className="block text-small font-medium text-ink-700 mb-1.5">
      {children}
      {hint ? <span className="ml-1.5 text-ink-500 font-normal">· {hint}</span> : null}
    </label>
  );
}
