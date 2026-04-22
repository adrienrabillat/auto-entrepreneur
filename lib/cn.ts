import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our tailwind.config declares custom font sizes named `display`, `h1`, `h2`,
 * `h3`, `body`, `small`, `xs`. Without this extension, tailwind-merge sees
 * `text-body` and thinks it conflicts with color utilities like `text-white`
 * (since both match the `text-*` shorthand), so it silently drops one of
 * them — in our case `text-white`, which turned the primary button's label
 * invisible. Registering the font-size names fixes the heuristic.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body", "small", "xs"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
