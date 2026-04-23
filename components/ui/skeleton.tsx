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
