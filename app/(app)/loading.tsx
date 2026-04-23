import {
  HeroCardSkeleton,
  ListRowSkeleton,
  StatCardSkeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton partagé entre toutes les pages du groupe (app).
 * Rendu immédiatement pendant la navigation client — le user voit la structure
 * Revolut (hero + stats + liste) pendant que le server component stream.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <HeroCardSkeleton />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="surface p-2">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </div>
    </div>
  );
}
