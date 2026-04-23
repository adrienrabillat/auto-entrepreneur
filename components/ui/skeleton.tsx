import { cn } from "@/lib/cn";

/**
 * Skeleton — bloc doux pulsant qui occupe la place d'un futur contenu.
 * Fond via CSS variable (bascule auto light/dark). Animation pulse Tailwind.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-surface-2", className)}
    />
  );
}

/** Card hero façon dashboard (montant XL + pills). */
export function HeroCardSkeleton() {
  return (
    <div className="surface p-6 md:p-9">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-4 h-14 md:h-16 w-64" />
      <Skeleton className="mt-4 h-7 w-44" />
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Skeleton className="h-11 w-44 rounded-full" />
        <Skeleton className="h-11 w-44 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
    </div>
  );
}

/** Stat card compacte (label + valeur 28px). */
export function StatCardSkeleton() {
  return (
    <div className="surface p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="mt-3 h-8 w-40" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/** Rangée de liste (avatar + titre + sous-titre + montant). */
export function ListRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-3.5 items-center px-3.5 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

/** Bloc en-tête : titre + sous-titre + CTA éventuel. */
export function HeaderSkeleton({ withCta = false }: { withCta?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {withCta ? <Skeleton className="h-11 w-full sm:w-44 rounded-full" /> : null}
    </div>
  );
}

/** Segmented filter en pills (factures : Toutes / Brouillons / En attente / Payées). */
export function SegmentedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="inline-flex bg-surface-2 p-1 rounded-full">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-full mx-0.5" />
      ))}
    </div>
  );
}

/** Carte de formulaire : en-tête (icône + titre) + lignes d'inputs. */
export function FormCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="surface p-5 md:p-7 space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Stepper 3 étapes (wizard Nouvelle facture). */
export function StepperSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Back link + titre compact (pages détail + formulaires). */
export function BackLinkHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64" />
    </div>
  );
}
