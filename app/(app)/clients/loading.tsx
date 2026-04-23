import { HeaderSkeleton, ListRowSkeleton } from "@/components/ui/skeleton";

/**
 * Skeleton page /clients — header + liste de rows avec avatars ronds.
 */
export default function ClientsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <HeaderSkeleton withCta />
      <div className="surface p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
