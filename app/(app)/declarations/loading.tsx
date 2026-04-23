import {
  HeaderSkeleton,
  StatCardSkeleton,
  ListRowSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /declarations — header + 2 stats (encaissé + prochaine déclaration)
 * + historique en liste.
 */
export default function DeclarationsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <HeaderSkeleton />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
      </div>
      <div className="surface p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
