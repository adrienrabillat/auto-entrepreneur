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
  // animate-page-in : keyframe défini dans tailwind.config.ts. Slide
  // horizontal de 16px depuis la droite + fade, 240ms ease-out-expo.
  // Plus "Revolut-like" que le fade-in-up (qui était un simple
  // translate-Y discret). Volontairement court : au-delà de 300ms
  // l'app donne une impression de lenteur, surtout sur navigation
  // rapide entre modules.
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
