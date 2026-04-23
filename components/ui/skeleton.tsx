import { cn } from "@/lib/cn";

/**
 * Skeleton primitive — a soft, pulsing ink-tinted bar used to fill the
 * visual slot of a future piece of content during route transitions and
 * data fetches. Pairs with `loading.tsx` files at the route group level to
 * give immediate feedback on navigation.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-ink-100", className)}
    />
  );
}

/** A tinted StatCard-shaped skeleton. */
export function StatCardSkeleton() {
  return (
    <div className="surface p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <Skeleton className="mt-4 h-8 w-40" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/** A generic row skeleton used in list pages (invoices, clients, declarations). */
export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 md:px-5 border-b border-ink-100 last:border-0">
      <Skeleton className="hidden sm:block h-10 w-10 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

/** Header block: title + subtitle + optional CTA. */
export function HeaderSkeleton({ withCta = true }: { withCta?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {withCta ? <Skeleton className="h-12 w-full sm:w-48 rounded-xl" /> : null}
    </div>
  );
}
