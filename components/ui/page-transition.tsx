"use client";

import { usePathname } from "next/navigation";

/**
 * Wrapper qui rejoue l'animation `fade-in-up` à chaque changement de route.
 *
 * Astuce React : on attache `key={pathname}` au div interne. Quand le
 * pathname change, React voit une key différente → il démonte le vieux
 * div et monte un neuf → la classe `animate-fade-in-up` redéclenche son
 * keyframe (qui sinon ne tournerait qu'une fois au premier mount du
 * layout, donc invisible lors des navigations).
 *
 * Utilisé dans app/(app)/layout.tsx pour donner un effet de transition
 * subtil entre les pages Dashboard / Factures / Devis / Clients / etc.
 *
 * Performance : le re-mount est sans impact perceptible (les composants
 * enfants sont des Server Components rendus côté serveur — seul le DOM
 * du wrapper bouge). 280ms d'animation, ease-out, opacity + 6px de
 * translateY (voir tailwind.config.ts → keyframes.fade-in-up).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
